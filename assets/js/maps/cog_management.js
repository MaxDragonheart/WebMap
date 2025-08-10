// assets/js/maps/cog_management.js
// Logica SPECIFICA per la mappa "cog_management"
// - Aggiunge i layer COG definiti nel .yaml
// - Esegue lo zoom automatico all'estensione quando richiesto
// Requisiti: geotiff.min.js caricato PRIMA di ol.js (vedi partial scripts.html)

(function () {
  // Piccolo helper: esegue cb quando la mappa è pronta (window.__olmap__ settata da map-init.js)
  function whenMapReady(cb, tries) {
    tries = (typeof tries === "number") ? tries : 100; // ~5s con 50ms
    if (window.__olmap__) return cb(window.__olmap__, window.__MAP_CONFIG__ || {});
    if (tries <= 0) return console.error("[cog_management] mappa non pronta");
    setTimeout(function () { whenMapReady(cb, tries - 1); }, 50);
  }

  function buildCogLayer(entry) {
    // entry: {title, url, visible, zoom_to_extent}
    if (!entry || !entry.url) return null;

    // Sorgente GeoTIFF (COG)
    var src = new ol.source.GeoTIFF({
      // NB: geotiff.js, nella build globale, si aspetta array di URL dietro le quinte;
      // ol.source.GeoTIFF accetta {sources:[{url:...}]} — corretto per il nostro caso
      sources: [{ url: entry.url }],
      convertToRGB: true,
      crossOrigin: "anonymous"
    });

    var lyr = new ol.layer.Tile({
      title: entry.title || "COG Layer",
      source: src,
      visible: !!entry.visible
    });

    // Se richiesto, zoom automatico quando i metadati sono disponibili
    if (entry.zoom_to_extent) {
      src.getView().then(function (info) {
        if (info && info.extent && window.__olmap__) {
          window.__olmap__.getView().fit(info.extent, {
            size: window.__olmap__.getSize(),
            maxZoom: entry.maxZoom || 14,
            padding: [20, 20, 20, 20]
          });
        }
      }).catch(function (err) {
        console.error("[cog_management] getView() GeoTIFF fallita:", err);
      });
    }

    return lyr;
  }

  whenMapReady(function (map, cfg) {
    // Difensivo: eseguo SOLO sulla pagina cog_management (se disponibile lo slug nella config)
    // In v5 non sempre c'è un id/slug nel JSON; in tal caso procedo solo se esistono layer COG.
    var hasCogLayersInCfg = Array.isArray(cfg.layers) && cfg.layers.some(function (e) { return e && e.type === "cog"; });
    if (!hasCogLayersInCfg) {
      // niente da fare su altre mappe
      return;
    }

    // Crea e aggiungi i COG definiti nel .yaml (per lo step 2 ce n'è uno)
    cfg.layers.forEach(function (entry) {
      if (entry && entry.type === "cog") {
        var lyr = buildCogLayer(entry);
        if (lyr) {
          map.addLayer(lyr);
        }
      }
    });

    // Assicura updateSize dopo l'aggiunta layer
    setTimeout(function(){ map.updateSize(); }, 0);
  });
})();
