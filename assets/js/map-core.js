// Usa la build globale di OpenLayers (window.ol) — niente import

(function () {
  function getConfig() {
    var raw = (typeof window !== "undefined") ? window.__MAP_CONFIG__ : {};
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch(e) { raw = {}; } }
    return raw || {};
  }

  function buildBasemaps(cfg) {
    var layers = [];
    var list = Array.isArray(cfg.basemaps) ? cfg.basemaps : [];
    for (var i = 0; i < list.length; i++) {
      var bm = list[i];
      var layer = null;
      if (bm.type === "osm") {
        layer = new ol.layer.Tile({ title: bm.title || "OpenStreetMap", source: new ol.source.OSM(), visible: !!bm.visible });
      } else if (bm.type === "stamen-toner") {
        layer = new ol.layer.Tile({
          title: bm.title || "Stamen Toner",
          source: new ol.source.XYZ({ url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png", attributions: "Stamen" }),
          visible: !!bm.visible
        });
      } else if (bm.type === "xyz" && bm.url) {
        layer = new ol.layer.Tile({
          title: bm.title || "XYZ",
          source: new ol.source.XYZ({ url: bm.url, attributions: bm.attribution || "" }),
          visible: !!bm.visible
        });
      }
      if (layer) layers.push(layer);
    }
    if (layers.length === 0) {
      layers.push(new ol.layer.Tile({ title: "OSM (fallback)", source: new ol.source.OSM(), visible: true }));
    }
    return layers;
  }

  function createMap(targetId) {
    var cfg = getConfig();

    var centerLonLat = (cfg.view && Array.isArray(cfg.view.center)) ? cfg.view.center : [12.4964, 41.9028];
    var zoomVal      = (cfg.view && typeof cfg.view.zoom === "number") ? cfg.view.zoom : 12;

    var view = new ol.View({
      center: ol.proj.fromLonLat([parseFloat(centerLonLat[0]), parseFloat(centerLonLat[1])]),
      zoom: zoomVal
    });

    var layers = buildBasemaps(cfg);

    var map = new ol.Map({
      target: targetId,
      layers: layers,
      view: view,
      controls: [
        new ol.control.Zoom(),
        new ol.control.Attribution({ collapsible: true })
      ]
    });

    // ---- Barra di scala in basso-centro ----
    var scaleTarget = document.getElementById("scale-container");
    if (scaleTarget) {
      map.addControl(new ol.control.ScaleLine({ target: scaleTarget }));
    }

    // ---- Coordinate in alto-centro ----
    var coordsEl = document.getElementById("coords-container");
    if (coordsEl) {
      map.on("pointermove", function (evt) {
        if (evt.dragging) return;
        var lonlat = ol.proj.toLonLat(evt.coordinate);
        if (!lonlat) return;
        coordsEl.textContent = "Lon: " + lonlat[0].toFixed(5) + "  Lat: " + lonlat[1].toFixed(5);
      });
    }

    // ---- Reset sotto ai pulsanti di zoom ----
    var resetWrap = document.querySelector("#map .reset-control");
    var resetBtn  = document.getElementById("reset-view");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        map.getView().animate({
          center: ol.proj.fromLonLat([parseFloat(centerLonLat[0]), parseFloat(centerLonLat[1])]),
          zoom: zoomVal,
          duration: 220
        });
      });
    }

    // Allinea il contenitore del reset subito sotto lo Zoom, con 8px di margine
    function alignResetUnderZoom() {
      if (!resetWrap) return;
      // trova il controllo Zoom
      var zoomCtrl = null;
      map.getControls().forEach(function (c) {
        if (c instanceof ol.control.Zoom) zoomCtrl = c;
      });
      if (!zoomCtrl || !zoomCtrl.element) return;

      var mapRect  = map.getTargetElement().getBoundingClientRect();
      var zoomRect = zoomCtrl.element.getBoundingClientRect();

      var top  = (zoomRect.bottom - mapRect.top) + 8;  // 8px di gap
      var left = (zoomRect.left   - mapRect.left);

      resetWrap.style.top  = top + "px";
      resetWrap.style.left = left + "px";
    }

    // Applica dopo il primo render e su resize
    map.once("postrender", alignResetUnderZoom);
    // OL ricalcola dimensioni anche dopo updateSize; agganciamoci agli eventi comuni
    window.addEventListener("resize", alignResetUnderZoom);
    // piccolo ritardo per sicurezza su mount
    setTimeout(alignResetUnderZoom, 0);

    // ---- Basemap select (alto-dx) ----
    var selectEl = document.getElementById("basemap-select");
    if (selectEl) {
      // Popola l'elenco con i titoli dei basemap
      selectEl.innerHTML = "";
      layers.forEach(function (lyr, idx) {
        var opt = document.createElement("option");
        opt.value = lyr.get("title") || ("Basemap " + (idx + 1));
        opt.textContent = opt.value;
        if (lyr.getVisible()) opt.selected = true;
        selectEl.appendChild(opt);
      });

      selectEl.addEventListener("change", function () {
        var val = selectEl.value;
        layers.forEach(function (lyr) { lyr.setVisible(false); });
        var hit = layers.find(function (lyr) { return (lyr.get("title") || "") === val; });
        if (hit) hit.setVisible(true);
      });
    }

    // Garantisco che almeno un basemap sia visibile
    var anyVisible = layers.some(function (l) { return l.getVisible(); });
    if (!anyVisible && layers.length > 0) layers[0].setVisible(true);

    setTimeout(function () { map.updateSize(); }, 0);
    return map;
  }

  // Esporta in global
  window.WebMapCore = { createMap: createMap };
})();
