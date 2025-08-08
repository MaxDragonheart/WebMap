(function () {
  if (!window.__MAP_CONFIG__) {
    console.error("[init] Missing __MAP_CONFIG__");
    return;
  }
  var cfg = window.__MAP_CONFIG__;
  console.log("[init] Map init with config:", cfg);

  var created = WebMap.createMap("map"); // il core legge da window.__MAP_CONFIG__
  var map = created.map;
  var basemapGroup = created.basemapGroup;
  window.__olmap__ = map;

  function enforce() {
    try {
      var center = (cfg && cfg.view && Array.isArray(cfg.view.center)) ? cfg.view.center : null;
      var zoom = (cfg && cfg.view && typeof cfg.view.zoom === "number") ? cfg.view.zoom : null;

      if (center) map.getView().setCenter(ol.proj.fromLonLat([parseFloat(center[0]), parseFloat(center[1])]));
      if (zoom !== null) map.getView().setZoom(zoom);

      var lonlat = ol.proj.toLonLat(map.getView().getCenter());
      console.log("[init] View after enforce:", { lon: lonlat[0], lat: lonlat[1], zoom: map.getView().getZoom() });
    } catch (e) {
      console.warn("[init] enforce error:", e);
    }
  }

  enforce();
  map.once("rendercomplete", enforce);

  WebMapControls.bindZoom(map);
  WebMapControls.bindPanReset(map, cfg);
  WebMapControls.bindCoordsAndScale(map);

  WebMapBasemaps.initPicker(basemapGroup);

  console.log("[init] Basemaps after init:",
    basemapGroup.getLayers().getArray().map(function (l) { return { title: l.get("title"), visible: l.getVisible() }; })
  );

  setTimeout(function () { map.updateSize(); }, 50);
})();
