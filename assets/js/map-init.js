// Avvio semplice usando la config globale
(function () {
  if (!window.__MAP_CONFIG__) {
    console.error("[init] Missing __MAP_CONFIG__");
    return;
  }
  console.log("[init] config:", window.__MAP_CONFIG__);
  var map = WebMapCore.createMap("map");
  window.__olmap__ = map;
  setTimeout(function () { map.updateSize(); }, 50);
})();
