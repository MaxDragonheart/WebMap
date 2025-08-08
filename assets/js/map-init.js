// Bootstrap pagina mappa con enforcement robusto del centro/zoom da config (dopo render)
(function () {
  if (!window.__MAP_CONFIG__) {
    console.error("Missing __MAP_CONFIG__");
    return;
  }
  const cfg = window.__MAP_CONFIG__;
  console.log("Map init with config:", cfg);

  const { map, basemapGroup } = WebMap.createMap("map", cfg);
  window.__olmap__ = map; // debug

  function enforceCenterZoom() {
    try {
      const center = Array.isArray(cfg?.view?.center) ? cfg.view.center : null;
      const zoom   = (typeof cfg?.view?.zoom === "number") ? cfg.view.zoom : null;
      if (center) {
        const target = ol.proj.fromLonLat([parseFloat(center[0]), parseFloat(center[1])]);
        map.getView().setCenter(target);
      }
      if (zoom !== null) {
        map.getView().setZoom(zoom);
      }
      const lonlat = ol.proj.toLonLat(map.getView().getCenter());
      console.log("View after enforce:", { lon: lonlat[0], lat: lonlat[1], zoom: map.getView().getZoom() });
    } catch (e) {
      console.warn("Unable to enforce center/zoom from config:", e);
    }
  }

  // subito e dopo il primo render per evitare override tardivi
  enforceCenterZoom();
  map.once("rendercomplete", enforceCenterZoom);

  // Controlli base
  WebMapControls.bindZoom(map);
  WebMapControls.bindPanReset(map, cfg);
  WebMapControls.bindCoordsAndScale(map);

  // Basemap picker (menu deve avere 3 voci con la tua config)
  WebMapBasemaps.initPicker(basemapGroup);

  console.log("Basemaps after init:",
    basemapGroup.getLayers().getArray().map(l => ({ title: l.get("title"), visible: l.getVisible() })));

  setTimeout(() => map.updateSize(), 50);
})();
