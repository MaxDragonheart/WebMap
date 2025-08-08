// Controlli: reset, coords + scala nel box centrale
window.WebMapControls = (function () {
  function bindReset(map, cfg) {
    var btn = document.getElementById("reset-btn");
    if (!btn) return;
    var center = (cfg && cfg.view && Array.isArray(cfg.view.center)) ? cfg.view.center : [12.4964, 41.9028];
    var zoom   = (cfg && cfg.view && typeof cfg.view.zoom === "number") ? cfg.view.zoom : 12;

    btn.addEventListener("click", function () {
      map.getView().animate({
        center: ol.proj.fromLonLat([parseFloat(center[0]), parseFloat(center[1])]),
        zoom: zoom,
        duration: 200
      });
    });
  }

  function bindCoords(map) {
    var el = document.getElementById("coords");
    if (!el) return;
    map.on("pointermove", function (evt) {
      var lonlat = ol.proj.toLonLat(evt.coordinate);
      if (!lonlat) return;
      el.textContent = "Lon: " + lonlat[0].toFixed(5) + "  Lat: " + lonlat[1].toFixed(5);
    });
  }

  return { bindReset: bindReset, bindCoords: bindCoords };
})();
