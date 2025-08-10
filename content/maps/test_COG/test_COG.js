// assets/js/maps/test_COG.js
(function () {
  // attendo che la mappa sia disponibile
  function start() {
    var map = window.__olmap__;
    if (!map) return;

    // cerca i due layer COG creati dal core (titoli dal tuo YAML)
    var core2015 = null, core2022 = null;
    map.getLayers().forEach(function (ly) {
      var t = ly.get('title') || '';
      if (t === 'COG RGB Campania 2015') core2015 = ly;
      if (t === 'COG RGB Campania 2022') core2022 = ly;
    });

    if (!core2015 || !core2022) {
      console.warn('[test_COG] Layer COG non trovati (attesi: 2015 e 2022).');
      return;
    }

    // recupero URL dalle sorgenti del core (dal YAML)
    function extractUrlFromGeoTIFFLayer(ly) {
      try {
        var src = ly.getSource();
        // ol/source/GeoTIFF espone getSources(); fallback a proprietà interne se necessario
        if (src && typeof src.getSources === 'function') {
          var arr = src.getSources();
          if (arr && arr[0] && arr[0].url) return arr[0].url;
        }
      } catch (e) {}
      return null;
    }

    var url2015 = extractUrlFromGeoTIFFLayer(core2015);
    var url2022 = extractUrlFromGeoTIFFLayer(core2022);
    if (!url2015 || !url2022) {
      console.error('[test_COG] Impossibile leggere gli URL dei COG dal core.');
      return;
    }

    // nascondo i layer core (WebGL)
    core2015.setVisible(false);
    core2022.setVisible(false);

    // ricreo i due layer come Canvas Tile (necessario per il clipping 2D dello swipe)
    function makeCanvasCog(url, title, visible, z) {
      var src = new ol.source.GeoTIFF({
        sources: [{ url: url }],
        // Forziamo immagine RGB pronta per canvas:
        convertToRGB: true,
        // E con dati uint8 (o normalizzati via core) funziona bene:
        normalize: true,
        interpolate: false,
        wrapX: false
      });
      var lyr = new ol.layer.Tile({
        title: title,
        source: src,
        visible: visible,
        zIndex: z
      });
      return lyr;
    }

    var tile2015 = makeCanvasCog(url2015, 'COG 2015 (Canvas)', true, 201); // sotto
    var tile2022 = makeCanvasCog(url2022, 'COG 2022 (Canvas)', true, 202); // sopra

    map.addLayer(tile2015);
    map.addLayer(tile2022);

    // Fit all'estensione del 2015 quando pronto (se il core non l'ha già fatto)
    tile2015.getSource().on('change', function () {
      var s = tile2015.getSource();
      if (s.getState() === 'ready') {
        try {
          var tg = s.getTileGrid();
          if (tg) {
            var srcProj = s.getProjection() || 'EPSG:3857';
            var srcExt = tg.getExtent();
            if (srcExt) {
              var dstProj = map.getView().getProjection();
              var fitExtent = ol.proj.transformExtent(srcExt, srcProj, dstProj);
              map.getView().fit(fitExtent, { duration: 300, padding: [40, 40, 40, 40] });
            }
          }
        } catch (e) {
          console.warn('[test_COG] Fit extent fallito:', e);
        }
      }
    });

    // --- Slider swipe (clip sul layer superiore — tile2022) ---
    var slider = document.getElementById('cog-swipe');
    var fraction = slider ? slider.value / 100 : 0.5;

    function applyClip(e) {
      // prerender con canvas 2D
      var ctx = e.context;
      if (!ctx || !ctx.canvas) return;
      var w = ctx.canvas.width;
      var h = ctx.canvas.height;
      var swipeX = w * fraction;

      ctx.save();
      ctx.beginPath();
      // Mostra solo la porzione a sinistra (0 -> swipeX) del layer superiore
      ctx.rect(0, 0, swipeX, h);
      ctx.clip();
    }

    function restoreClip(e) {
      var ctx = e.context;
      if (!ctx) return;
      ctx.restore();
    }

    // bind eventi di rendering 2D
    tile2022.on('prerender', applyClip);
    tile2022.on('postrender', restoreClip);

    if (slider) {
      slider.addEventListener('input', function () {
        fraction = slider.value / 100;
        map.render(); // ridisegna per applicare il nuovo clip
      });
    }

    console.log('[test_COG] Layer-swipe attivato (Canvas Tile).');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(start, 0);
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
