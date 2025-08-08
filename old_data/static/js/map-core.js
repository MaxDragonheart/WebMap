/* global ol */
(function (global) {
  'use strict';

  // --- utils ---------------------------------------------------------------
  function createBaseSource(item) {
    const type = (item.type || 'osm').toLowerCase();
    if (type === 'osm') {
      return new ol.source.OSM();
    }
    if (type === 'xyz') {
      if (!item.url) {
        console.warn('Basemap XYZ senza url:', item);
        return new ol.source.OSM();
      }
      return new ol.source.XYZ({
        url: item.url,
        attributions: item.attribution || ''
      });
    }
    console.warn('Tipo basemap non riconosciuto, uso OSM:', item.type);
    return new ol.source.OSM();
  }

  function buildBasemapLayers(basemaps, defaultId) {
    const layers = [];
    let foundDefault = false;

    (basemaps || []).forEach((bm, i) => {
      const layer = new ol.layer.Tile({
        title: bm.name || bm.id || ('bm_' + i),
        visible: false,
        source: createBaseSource(bm),
        zIndex: 0
      });
      layer.__bmId = bm.id || ('bm_' + i);
      layers.push(layer);
      if (defaultId && layer.__bmId === defaultId) {
        layer.setVisible(true);
        foundDefault = true;
      }
    });

    if (!foundDefault && layers.length) {
      layers[0].setVisible(true);
    }
    return layers;
  }

  function enablePopup(map, template, ids) {
    if (!ids || !ids.popupContainerId) return;

    const container = document.getElementById(ids.popupContainerId);
    const content   = ids.popupContentId ? document.getElementById(ids.popupContentId) : null;
    const closer    = ids.popupCloserId   ? document.getElementById(ids.popupCloserId)   : null;

    if (!container) return;

    const overlay = new ol.Overlay({
      element: container,
      autoPan: { animation: { duration: 250 } }
    });
    map.addOverlay(overlay);

    if (closer) {
      closer.onclick = function () {
        overlay.setPosition(undefined);
        closer.blur && closer.blur();
        return false;
      };
    }

    map.on('singleclick', function (evt) {
      const coord = ol.proj.toLonLat(evt.coordinate);
      const lon = Number(coord[0]).toFixed(5);
      const lat = Number(coord[1]).toFixed(5);

      const html = (template || 'Lon: {lon}, Lat: {lat}')
        .replace('{lon}', lon)
        .replace('{lat}', lat);

      if (content) content.innerHTML = html;
      overlay.setPosition(evt.coordinate);
    });
  }

  function hookOpacitySlider(map, layerPredicate, sliderId) {
    if (!sliderId) return;
    const el = document.getElementById(sliderId);
    if (!el) return;

    const targetLayers = map.getLayers().getArray().filter(layerPredicate);
    function applyOpacity() {
      const v = parseFloat(el.value);
      targetLayers.forEach(l => l.setOpacity(isFinite(v) ? v : 1));
    }
    el.addEventListener('input', applyOpacity);
    el.addEventListener('change', applyOpacity);
    applyOpacity();
  }

  function ensureArray(x) { return Array.isArray(x) ? x : []; }

  // --- main ----------------------------------------------------------------
  function createMap(cfg, targetId, options) {
    cfg = cfg || {};
    options = options || {};

    // View
    const centerLonLat = ensureArray(cfg.center).length === 2 ? cfg.center : [14.25, 40.85];
    const zoom = Number(cfg.zoom || 12);

    const view = new ol.View({
      center: ol.proj.fromLonLat(centerLonLat),
      zoom: zoom,
      maxZoom: cfg.maxZoom || 19,
      minZoom: cfg.minZoom || 2
    });

    // Basemaps
    const bm = cfg.basemaps || {};
    const baseLayers = buildBasemapLayers(bm.list || bm, bm.defaultBasemap || bm.default || 'osm');

    // Map: niente defaults() -> aggiungiamo i controlli a mano
    const map = new ol.Map({
      target: targetId,
      view: view,
      layers: baseLayers,
      controls: []  // niente ol.control.defaults
    });

    // Controlli base
    map.addControl(new ol.control.Zoom());
    // Attribution opzionale (disattiva/attiva come preferisci)
    map.addControl(new ol.control.Attribution({ collapsible: true }));

    // Controls opzionali da config
    const controls = cfg.controls || {};
    if (controls.fullscreen) map.addControl(new ol.control.FullScreen());
    if (controls.scaleLine)  map.addControl(new ol.control.ScaleLine());

    // Popup opzionale
    if (cfg.popup && cfg.popup.enabled) {
      enablePopup(map, cfg.popup.content, options);
    }

    // Slider opacità per raster (quando li aggiungerai)
    hookOpacitySlider(
      map,
      (l) => (l instanceof ol.layer.Tile || l instanceof ol.layer.Image) && baseLayers.indexOf(l) === -1,
      options.opacitySliderId
    );

    // Helper per cambiare basemap
    map.__setBasemap = function (id) {
      baseLayers.forEach(l => l.setVisible(l.__bmId === id));
    };

    global.__OL_MAP__ = map;
    return map;
  }

  // export globale
  global.createMap = createMap;

})(window);
