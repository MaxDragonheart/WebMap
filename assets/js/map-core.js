// Usa la build globale di OpenLayers (window.ol) — niente import

(function () {
  function getConfig() {
    var raw = (typeof window !== "undefined") ? window.__MAP_CONFIG__ : {};
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch(e) { raw = {}; } }
    console.log("[core] cfg letto:", raw);
    return raw || {};
  }

  function buildBasemaps(cfg) {
    var layers = [];
    var list = Array.isArray(cfg.basemaps) ? cfg.basemaps : [];
    for (var i = 0; i < list.length; i++) {
      var bm = list[i];
      var layer = null;
      if (bm.type === "osm") {
        layer = new ol.layer.Tile({
          title: bm.title || "OpenStreetMap",
          source: new ol.source.OSM(),
          visible: !!bm.visible
        });
      } else if (bm.type === "stamen-toner") {
        layer = new ol.layer.Tile({
          title: bm.title || "Stamen Toner",
          source: new ol.source.XYZ({
            url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
            attributions: "Stamen"
          }),
          visible: !!bm.visible
        });
      } else if (bm.type === "xyz" && bm.url) {
        layer = new ol.layer.Tile({
          title: bm.title || "XYZ",
          source: new ol.source.XYZ({
            url: bm.url,
            attributions: bm.attribution || ""
          }),
          visible: !!bm.visible
        });
      }
      if (layer) layers.push(layer);
    }
    if (layers.length === 0) {
      console.warn("[core] Nessun basemap dal YAML. Inject OSM fallback.");
      layers.push(new ol.layer.Tile({ title: "OSM (fallback)", source: new ol.source.OSM(), visible: true }));
    }
    return layers;
  }

  function parseCenter(cfg) {
    var def = [12.4964, 41.9028]; // Roma fallback
    if (!cfg.view || !Array.isArray(cfg.view.center)) return def;
    var c = cfg.view.center;
    if (c.length !== 2) return def;
    var lon = Number(c[0]), lat = Number(c[1]);
    if (!isFinite(lon) || !isFinite(lat)) return def;
    return [lon, lat]; // atteso lon,lat
  }

  function parseZoom(cfg) {
    var z = (cfg.view && typeof cfg.view.zoom === "number") ? cfg.view.zoom : 12;
    return isFinite(z) ? z : 12;
  }

  function createMap(targetId) {
    var cfg = getConfig();

    var centerLonLat = parseCenter(cfg);
    var zoomVal      = parseZoom(cfg);
    console.log("[core] view da cfg -> center:", centerLonLat, "zoom:", zoomVal);

    var view = new ol.View({
      center: ol.proj.fromLonLat([centerLonLat[0], centerLonLat[1]]),
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

    // Barra di scala (basso-centro)
    var scaleTarget = document.getElementById("scale-container");
    if (scaleTarget) {
      map.addControl(new ol.control.ScaleLine({ target: scaleTarget }));
    }

    // Coordinate (alto-centro)
    var coordsEl = document.getElementById("coords-container");
    if (coordsEl) {
      map.on("pointermove", function (evt) {
        if (evt.dragging) return;
        var lonlat = ol.proj.toLonLat(evt.coordinate);
        if (!lonlat) return;
        coordsEl.textContent = "Lon: " + lonlat[0].toFixed(5) + "  Lat: " + lonlat[1].toFixed(5);
      });
    }

    // Reset sotto zoom
    var resetWrap = document.querySelector("#map .reset-control");
    var resetBtn  = document.getElementById("reset-view");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        map.getView().animate({
          center: ol.proj.fromLonLat([centerLonLat[0], centerLonLat[1]]),
          zoom: zoomVal,
          duration: 220
        });
      });
    }

    function alignResetUnderZoom() {
      if (!resetWrap) return;
      var zoomCtrl = null;
      map.getControls().forEach(function (c) {
        if (c instanceof ol.control.Zoom) zoomCtrl = c;
      });
      if (!zoomCtrl || !zoomCtrl.element) return;

      var mapRect  = map.getTargetElement().getBoundingClientRect();
      var zoomRect = zoomCtrl.element.getBoundingClientRect();

      var top  = (zoomRect.bottom - mapRect.top) + 8;
      var left = (zoomRect.left   - mapRect.left);

      resetWrap.style.top  = top + "px";
      resetWrap.style.left = left + "px";
    }
    map.once("postrender", alignResetUnderZoom);
    window.addEventListener("resize", alignResetUnderZoom);
    setTimeout(alignResetUnderZoom, 0);

    // Basemap select
    var selectEl = document.getElementById("basemap-select");
    if (selectEl) {
      selectEl.innerHTML = "";
      layers.forEach(function (lyr, idx) {
        var opt = document.createElement("option");
        var title = lyr.get("title") || ("Basemap " + (idx + 1));
        opt.value = title;
        opt.textContent = title;
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

    // safety: almeno un basemap visibile
    var anyVisible = layers.some(function (l) { return l.getVisible(); });
    if (!anyVisible && layers.length > 0) layers[0].setVisible(true);

    setTimeout(function () { map.updateSize(); }, 0);
    return map;
  }

  window.WebMapCore = { createMap: createMap };
})();
