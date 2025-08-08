// Core v3 (DEBUG): legge la config da window.__MAP_CONFIG__, parse se stringa
window.WebMap = (function () {
  console.log("%c[core v3] loaded", "background:#222;color:#0f0;padding:2px 6px;border-radius:3px");

  function safeParseMaybe(str) {
    if (typeof str !== "string") return str;
    try { return JSON.parse(str); } catch (e) { console.warn("[core v3] JSON parse fallita:", e, str); return {}; }
  }

  function getConfig() {
    var raw = (typeof window !== "undefined") ? window.__MAP_CONFIG__ : {};
    var cfg = safeParseMaybe(raw) || {};
    return cfg;
  }

  function createView() {
    var cfg = getConfig();
    var hasCenter = cfg && cfg.view && Array.isArray(cfg.view.center) && cfg.view.center.length === 2;
    var hasZoom   = cfg && cfg.view && typeof cfg.view.zoom === "number";

    var centerLonLat = hasCenter ? cfg.view.center : [12.4964, 41.9028];
    var zoomVal      = hasZoom   ? cfg.view.zoom   : 12;

    console.log("[core v3] createView:", { center: centerLonLat, zoom: zoomVal, hasCenter, hasZoom });
    return new ol.View({
      center: ol.proj.fromLonLat([parseFloat(centerLonLat[0]), parseFloat(centerLonLat[1])]),
      zoom: zoomVal
    });
  }

  function basemapFromConfig(base, idx) {
    console.log("[core v3] basemapFromConfig", idx, base);
    if (!base || !base.type) return null;

    if (base.type === "osm") {
      return new ol.layer.Tile({ title: base.title || "OpenStreetMap", source: new ol.source.OSM(), visible: !!base.visible });
    }
    if (base.type === "stamen-toner") {
      return new ol.layer.Tile({
        title: base.title || "Stamen Toner",
        source: new ol.source.XYZ({ url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png", attributions: "Stamen" }),
        visible: !!base.visible
      });
    }
    if (base.type === "xyz" && base.url) {
      return new ol.layer.Tile({
        title: base.title || "XYZ",
        source: new ol.source.XYZ({ url: base.url, attributions: base.attribution || "" }),
        visible: !!base.visible
      });
    }
    console.warn("[core v3] tipo non gestito o url mancante", base);
    return null;
  }

  function normalizeBasemaps(bm) {
    bm = safeParseMaybe(bm);
    if (!bm) return [];
    if (Array.isArray(bm)) return bm;
    if (typeof bm === "object") return Object.values(bm);
    return [];
  }

  function buildBasemapGroup() {
    var cfg = getConfig();
    console.log("[core v3] raw basemaps =", cfg ? cfg.basemaps : undefined, "type:", typeof (cfg && cfg.basemaps));

    var list = normalizeBasemaps(cfg && cfg.basemaps);
    console.log("[core v3] normalized basemaps length =", list.length);

    var layers = [];
    for (var i = 0; i < list.length; i++) {
      var lyr = basemapFromConfig(list[i], i);
      if (lyr) layers.push(lyr);
    }

    if (layers.length === 0) {
      console.warn("[core v3] No basemaps: inject OSM fallback");
      layers.push(new ol.layer.Tile({ title: "OSM (fallback)", source: new ol.source.OSM(), visible: true }));
    }

    var group = new ol.layer.Group({ title: "Basemaps", layers: layers });
    console.log("[core v3] BasemapGroup layers:",
      group.getLayers().getArray().map(function (l) { return { title: l.get("title"), visible: l.getVisible() }; })
    );
    return group;
  }

  function createMap(targetId) {
    var view = createView();
    var basemapGroup = buildBasemapGroup();

    var map = new ol.Map({ target: targetId, layers: [basemapGroup], view: view });

    var anyVisible = basemapGroup.getLayers().getArray().some(function (l) { return l.getVisible(); });
    if (!anyVisible && basemapGroup.getLayers().getLength() > 0) {
      basemapGroup.getLayers().item(0).setVisible(true);
      console.log("[core v3] Forced visible on first basemap.");
    }

    setTimeout(function () { map.updateSize(); }, 0);
    return { map: map, basemapGroup: basemapGroup };
  }

  return { createMap: createMap, currentScale: function (map) {
    var resolution = map.getView().getResolution();
    var dpi = 25.4 / 0.28;
    var mpu = ol.proj.get(map.getView().getProjection()).getMetersPerUnit();
    return Math.round(resolution * mpu * 39.37 * dpi);
  }};
})();
