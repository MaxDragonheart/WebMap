function activateSwipe(map, core2015, core2022) {
  if (swipeActivated) return;

  // Recupero URL da layer o, in fallback, da config
  var url2015 = extractUrlFromGeoTIFFLayer(core2015);
  var url2022 = extractUrlFromGeoTIFFLayer(core2022);

  if (!url2015 || !url2022) {
    try {
      var cfgLayers = (window.__MAP_CONFIG__ && window.__MAP_CONFIG__.layers) || [];
      var l2015 = cfgLayers.find(l => l.title === 'COG RGB Campania 2015');
      var l2022 = cfgLayers.find(l => l.title === 'COG RGB Campania 2022');
      if (!url2015 && l2015) url2015 = l2015.url;
      if (!url2022 && l2022) url2022 = l2022.url;
    } catch (e) {
      console.warn('[test_COG] Errore nel recupero URL da config:', e);
    }
  }

  if (!url2015 || !url2022) {
    console.error('[test_COG] Impossibile recuperare entrambi gli URL dei COG.');
    return;
  }

  // Nascondi i layer WebGL
  core2015.setVisible(false);
  core2022.setVisible(false);

  // Crea i layer canvas per clipping
  var tile2015 = makeCanvasCog(url2015, 'COG 2015 (Canvas)', true, 201);
  var tile2022 = makeCanvasCog(url2022, 'COG 2022 (Canvas)', true, 202);
  map.addLayer(tile2015);
  map.addLayer(tile2022);

  // Fit extent dopo caricamento primo layer
  tile2015.getSource().once('change', function () {
    var s = tile2015.getSource();
    if (s.getState() === 'ready') {
      try {
        var tg = s.getTileGrid();
        var srcProj = s.getProjection() || 'EPSG:3857';
        var srcExt = tg && tg.getExtent();
        if (srcExt) {
          var dstProj = map.getView().getProjection();
          var fitExtent = ol.proj.transformExtent(srcExt, srcProj, dstProj);
          map.getView().fit(fitExtent, { duration: 300, padding: [40, 40, 40, 40] });
        }
      } catch (e) {
        console.warn('[test_COG] Fit extent fallito:', e);
      }
    }
  });

  // Slider + clipping
  var slider = document.getElementById('cog-swipe');
  var fraction = slider ? slider.value / 100 : 0.5;

  function applyClip(e) {
    var ctx = e.context;
    if (!ctx || !ctx.canvas) return;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w * fraction, h);
    ctx.clip();
  }
  function restoreClip(e) {
    var ctx = e.context;
    if (ctx) ctx.restore();
  }

  tile2022.on('prerender', applyClip);
  tile2022.on('postrender', restoreClip);

  if (slider) {
    slider.addEventListener('input', function () {
      fraction = slider.value / 100;
      map.render();
    });
  }

  swipeActivated = true;
  console.log('[test_COG] Layer-swipe attivato.');
}
