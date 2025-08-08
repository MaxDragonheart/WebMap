// Core: crea mappa, layer di base da config e utilità + fallback
window.WebMap = (function () {
  function createView(cfg) {
    const center = cfg?.view?.center || [12.4964, 41.9028]; // Roma
    const zoom = cfg?.view?.zoom ?? 12;
    return new ol.View({
      center: ol.proj.fromLonLat(center),
      zoom
    });
  }

  function basemapFromConfig(base) {
    if (!base || !base.type) return null;

    if (base.type === "osm") {
      return new ol.layer.Tile({
        title: base.title || "OSM",
        source: new ol.source.OSM(),
        visible: !!base.visible
      });
    }

    if (base.type === "stamen-toner") {
      return new ol.layer.Tile({
        title: base.title || "Stamen Toner",
        source: new ol.source.XYZ({
          url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
          attributions: "Stamen"
        }),
        visible: !!base.visible
      });
    }

    if (base.type === "xyz" && base.url) {
      return new ol.layer.Tile({
        title: base.title || "XYZ",
        source: new ol.source.XYZ({
          url: base.url,
          attributions: base.attribution || ""
        }),
        visible: !!base.visible
      });
    }

    console.warn("Unknown basemap type or missing url:", base);
    return null;
  }

  function buildBasemapGroup(cfg) {
    const list = Array.isArray(cfg?.basemaps) ? cfg.basemaps : [];
    const layers = list.map(basemapFromConfig).filter(Boolean);

    // Fallback: se non ci sono layer, aggiungi OSM
    if (layers.length === 0) {
      console.warn("No basemaps from config. Injecting default OSM fallback.");
      layers.push(new ol.layer.Tile({ title: "OSM (fallback)", source: new ol.source.OSM(), visible: true }));
    }

    const group = new ol.layer.Group({ title: "Basemaps", layers });
    console.log("BasemapGroup layers:", group.getLayers().getLength(),
                group.getLayers().getArray().map(l => ({ title: l.get("title"), visible: l.getVisible() })));
    return group;
  }

  function createMap(targetId, cfg) {
    const view = createView(cfg);
    const basemapGroup = buildBasemapGroup(cfg);

    const map = new ol.Map({
      target: targetId,
      layers: [basemapGroup],
      view
    });

    // Se nessun layer è visibile, accendi il primo
    let anyVisible = false;
    basemapGroup.getLayers().forEach(l => { if (l.getVisible()) anyVisible = true; });
    if (!anyVisible && basemapGroup.getLayers().getLength() > 0) {
      basemapGroup.getLayers().item(0).setVisible(true);
      console.log("Forced visible on first basemap.");
    }

    // Forza un render
    setTimeout(() => map.updateSize(), 0);

    return { map, basemapGroup };
  }

  function currentScale(map) {
    const resolution = map.getView().getResolution();
    const dpi = 25.4 / 0.28; // 90.714...
    const mpu = ol.proj.get(map.getView().getProjection()).getMetersPerUnit();
    const scale = resolution * mpu * 39.37 * dpi;
    return Math.round(scale);
  }

  return { createMap, currentScale };
})();
