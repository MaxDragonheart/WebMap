(function () {
  if (!window.__MAP_CONFIG__) {
    console.error("[init] Missing __MAP_CONFIG__");
    return;
  }
  console.log("[init] config:", window.__MAP_CONFIG__);
  var created = WebMap.createMap("map");
  window.__olmap__ = created.map;
  setTimeout(function(){ created.map.updateSize(); }, 50);
})();
