// Bootstrap: crea mappa full screen e attiva controlli/picker nel layout nuovo
(function () {
  if (!window.__MAP_CONFIG__) {
    console.error("[init] Missing __MAP_CONFIG__");
    return;
  }
  var cfg = window.__MAP_CONFIG__;
  console.log("[init] config:", cfg);

  var created = WebMap.createMap("map");
  var map = created.map;
  var basemapGroup = created.basemapGroup;

  // Controlli
  WebMapControls.bindReset(map, cfg);
  WebMapControls.bindCoords(map);

  // Basemap picker
  WebMapBasemaps.initPicker(basemapGroup);

  // Forza resize
  setTimeout(function () { map.updateSize(); }, 50);
})();
