// Avvio robusto che aspetta __MAP_CONFIG__ senza log di warning inutili
(function () {
  function start() {
    var cfg = window.__MAP_CONFIG__ || {};
    console.log("[init] using config:", cfg);

    var map = WebMapCore.createMap("map");
    window.__olmap__ = map;

    // assicura il resize dopo il mount
    setTimeout(function () { map.updateSize(); }, 50);
  }

  function waitForConfig() {
    if (window.__MAP_CONFIG__) {
      start();
      return;
    }
    // Attende fino a 2s che scripts.html imposti __MAP_CONFIG__
    var tries = 0, maxTries = 40; // 40 * 50ms = 2000ms
    var timer = setInterval(function () {
      if (window.__MAP_CONFIG__) {
        clearInterval(timer);
        start();
      } else if (++tries >= maxTries) {
        console.warn("[init] __MAP_CONFIG__ non trovata entro il timeout: procedo con {}");
        window.__MAP_CONFIG__ = {};
        clearInterval(timer);
        start();
      }
    }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForConfig);
  } else {
    waitForConfig();
  }
})();
