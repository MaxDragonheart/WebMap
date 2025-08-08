// Bootstrap: legge __MAP_CONFIG__ e istanzia la mappa di test
(function () {
  if (!window.__MAP_CONFIG__) {
    console.error("Missing __MAP_CONFIG__");
    return;
  }
  const cfg = window.__MAP_CONFIG__;

  // 1) crea mappa
  const { map, basemapGroup } = WebMap.createMap("map", cfg);

  // 2) controlli base
  WebMapControls.bindZoom(map);
  WebMapControls.bindPanReset(map, cfg);
  WebMapControls.bindCoordsAndScale(map);

  // 3) basemap picker
  WebMapBasemaps.initPicker(basemapGroup);

  // 4) se config specifica un basemap "visible:true", assicurati che uno solo lo sia
  let anyVisible = false;
  basemapGroup.getLayers().forEach(l => { if (l.getVisible()) anyVisible = true; });
  if (!anyVisible && basemapGroup.getLayers().getLength() > 0) {
    basemapGroup.getLayers().item(0).setVisible(true);
  }
})();
