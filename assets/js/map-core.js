// Core v4: legge la config, crea mappa full-screen e MONTA i controlli custom via JS
window.WebMap = (function () {
  // --- utils config ---
  function safeParseMaybe(str) {
    if (typeof str !== "string") return str;
    try { return JSON.parse(str); } catch { return {}; }
  }
  function getConfig() {
    var raw = (typeof window !== "undefined") ? window.__MAP_CONFIG__ : {};
    return safeParseMaybe(raw) || {};
  }

  // --- view ---
  function createView() {
    var cfg = getConfig();
    var hasCenter = cfg && cfg.view && Array.isArray(cfg.view.center) && cfg.view.center.length === 2;
    var hasZoom   = cfg && cfg.view && typeof cfg.view.zoom === "number";
    var centerLonLat = hasCenter ? cfg.view.center : [12.4964, 41.9028];
    var zoomVal      = hasZoom   ? cfg.view.zoom   : 12;

    return new ol.View({
      center: ol.proj.fromLonLat([parseFloat(centerLonLat[0]), parseFloat(centerLonLat[1])]),
      zoom: zoomVal
    });
  }

  // --- basemaps ---
  function basemapFromConfig(base) {
    if (!base || !base.type) return null;

    if (base.type === "osm") {
      return new ol.layer.Tile({
        title: base.title || "OpenStreetMap",
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
        source: new ol.source.XYZ({ url: base.url, attributions: base.attribution || "" }),
        visible: !!base.visible
      });
    }
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
    var list = normalizeBasemaps(cfg && cfg.basemaps);
    var layers = [];
    for (var i = 0; i < list.length; i++) {
      var lyr = basemapFromConfig(list[i]);
      if (lyr) layers.push(lyr);
    }
    if (layers.length === 0) {
      layers.push(new ol.layer.Tile({ title: "OSM (fallback)", source: new ol.source.OSM(), visible: true }));
    }
    return new ol.layer.Group({ title: "Basemaps", layers: layers });
  }

  // --- controlli custom montati via JS (evita che OL li rimuova) ---
  function mountStatusBarControl(map) {
    var wrap = document.createElement("div");
    wrap.className = "ol-control status-bar";
    // coord
    var coords = document.createElement("span");
    coords.id = "coords";
    coords.textContent = "Lon: —  Lat: —";
    // scale line target
    var scale = document.createElement("div");
    scale.id = "scale-line";
    wrap.appendChild(coords);
    wrap.appendChild(scale);
    map.addControl(new ol.control.Control({ element: wrap }));
    // aggiungo il vero ScaleLine puntando al div
    map.addControl(new ol.control.ScaleLine({ target: scale }));
  }

  function mountResetControl(map) {
    var wrap = document.createElement("div");
    wrap.className = "ol-control reset-control";
    var btn = document.createElement("button");
    btn.id = "reset-btn";
    btn.type = "button";
    btn.title = "Reset view";
    btn.textContent = "↺";
    wrap.appendChild(btn);
    map.addControl(new ol.control.Control({ element: wrap }));
  }

  function mountBasemapPickerControl(map) {
    var wrap = document.createElement("div");
    wrap.className = "ol-control basemap-control";
    // toggle
    var toggle = document.createElement("button");
    toggle.id = "basemap-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Basemap ▾";
    // menu
    var menu = document.createElement("div");
    menu.id = "basemap-menu";
    menu.className = "menu hidden";
    menu.setAttribute("aria-hidden", "true");

    wrap.appendChild(toggle);
    wrap.appendChild(menu);
    map.addControl(new ol.control.Control({ element: wrap }));
  }

  function createMap(targetId) {
    var view = createView();
    var basemapGroup = buildBasemapGroup();

    // controlli core espliciti
    var controls = [
      new ol.control.Zoom(),
      new ol.control.Attribution({ collapsible: true })
    ];

    var map = new ol.Map({
      target: targetId,
      layers: [basemapGroup],
      view: view,
      controls: controls
    });

    // Monta i nostri controlli DOPO che OL ha creato il suo DOM
    mountStatusBarControl(map);
    mountResetControl(map);
    mountBasemapPickerControl(map);

    // se nessun basemap è visibile, accendo il primo
    var anyVisible = basemapGroup.getLayers().getArray().some(function (l) { return l.getVisible(); });
    if (!anyVisible && basemapGroup.getLayers().getLength() > 0) {
      basemapGroup.getLayers().item(0).setVisible(true);
    }

    setTimeout(function () { map.updateSize(); }, 0);
    return { map: map, basemapGroup: basemapGroup };
  }

  return { createMap: createMap };
})();
