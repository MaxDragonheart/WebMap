// Core v5: controlli creati e FUNZIONALI via OpenLayers
window.WebMap = (function () {
  // --- utils ---
  function safeParseMaybe(x) {
    if (typeof x !== "string") return x;
    try { return JSON.parse(x); } catch { return {}; }
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

  // --- controlli custom (creati + handler) ---
  function mountStatusBar(map) {
    var wrap = document.createElement("div");
    wrap.className = "ol-control ol-unselectable status-bar";
    var coords = document.createElement("span");
    coords.id = "coords"; coords.textContent = "Lon: —  Lat: —";
    var scale = document.createElement("div");
    scale.id = "scale-line";
    wrap.appendChild(coords); wrap.appendChild(scale);
    map.addControl(new ol.control.Control({ element: wrap }));
    map.addControl(new ol.control.ScaleLine({ target: scale }));
    // handler coordinate
    map.on("pointermove", function (evt) {
      var lonlat = ol.proj.toLonLat(evt.coordinate);
      if (!lonlat) return;
      coords.textContent = "Lon: " + lonlat[0].toFixed(5) + "  Lat: " + lonlat[1].toFixed(5);
    });
  }

  function mountReset(map) {
    var wrap = document.createElement("div");
    wrap.className = "ol-control ol-unselectable reset-control";
    var btn = document.createElement("button");
    btn.type = "button"; btn.title = "Reset view"; btn.textContent = "↺";
    wrap.appendChild(btn);
    map.addControl(new ol.control.Control({ element: wrap }));
    // handler reset
    var cfg = getConfig();
    var center = (cfg && cfg.view && Array.isArray(cfg.view.center)) ? cfg.view.center : [12.4964, 41.9028];
    var zoom   = (cfg && cfg.view && typeof cfg.view.zoom === "number") ? cfg.view.zoom : 12;
    btn.addEventListener("click", function () {
      map.getView().animate({ center: ol.proj.fromLonLat([parseFloat(center[0]), parseFloat(center[1])]), zoom: zoom, duration: 200 });
    });
  }

  function mountBasemapPicker(map, basemapGroup) {
    var wrap = document.createElement("div");
    wrap.className = "ol-control ol-unselectable basemap-control";
    var toggle = document.createElement("button");
    toggle.type = "button"; toggle.id = "basemap-toggle"; toggle.textContent = "Basemap ▾";
    toggle.setAttribute("aria-expanded", "false");
    var menu = document.createElement("div");
    menu.id = "basemap-menu"; menu.className = "menu hidden"; menu.setAttribute("aria-hidden", "true");
    wrap.appendChild(toggle); wrap.appendChild(menu);
    map.addControl(new ol.control.Control({ element: wrap }));

    function buildMenu() {
      menu.innerHTML = "";
      var layers = basemapGroup.getLayers().getArray();
      layers.forEach(function (layer, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = layer.get("title") || ("Basemap " + (idx + 1));
        btn.addEventListener("click", function () {
          layers.forEach(function (l) { l.setVisible(false); });
          layer.setVisible(true);
          hideMenu();
        });
        menu.appendChild(btn);
      });
    }
    function showMenu() {
      menu.classList.remove("hidden");
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
    }
    function hideMenu() {
      menu.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
    }

    buildMenu();
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      open ? hideMenu() : showMenu();
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) hideMenu();
    });
  }

  // --- create map ---
  function createMap(targetId) {
    var view = createView();
    var basemapGroup = buildBasemapGroup();

    var map = new ol.Map({
      target: targetId,
      layers: [basemapGroup],
      view: view,
      controls: [
        new ol.control.Zoom(),
        new ol.control.Attribution({ collapsible: true })
      ]
    });

    // monta i controlli custom e relativi handler
    mountStatusBar(map);
    mountReset(map);
    mountBasemapPicker(map, basemapGroup);

    // garantisci un basemap visibile
    var anyVisible = basemapGroup.getLayers().getArray().some(function (l) { return l.getVisible(); });
    if (!anyVisible && basemapGroup.getLayers().getLength() > 0) basemapGroup.getLayers().item(0).setVisible(true);

    setTimeout(function () { map.updateSize(); }, 0);
    return { map: map, basemapGroup: basemapGroup };
  }

  return { createMap: createMap };
})();
