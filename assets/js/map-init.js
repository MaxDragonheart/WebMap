// Bootstrap pagina mappa con log e sicurezza sulla visibilità layer
(function () {
  if (!window.__MAP_CONFIG__) {
    console.error("Missing __MAP_CONFIG__");
    return;
  }
  const cfg = window.__MAP_CONFIG__;
  console.log("Map init with config:", cfg);

  const created = WebMap.createMap("map", cfg);
  const map = created.map;
  const basemapGroup = created.basemapGroup;

  // Espongo per debug
  window.__olmap__ = map;

  // Controlli base
  WebMapControls.bindZoom(map);
  WebMapControls.bindPanReset(map, cfg);
  WebMapControls.bindCoordsAndScale(map);

  // Basemap picker
  WebMapBasemaps.initPicker(basemapGroup);

  // Ricontrollo visibilità e loggo
  let anyVisible = false;
  basemapGroup.getLayers().forEach(l => { if (l.getVisible()) anyVisible = true; });
  if (!anyVisible && basemapGroup.getLayers().getLength() > 0) {
    basemapGroup.getLayers().item(0).setVisible(true);
  }
  console.log("Basemaps after init:",
              basemapGroup.getLayers().getArray().map(l => ({ title: l.get("title"), visible: l.getVisible() })));

  // Trigger update size
  setTimeout(() => map.updateSize(), 50);
})();
