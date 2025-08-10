// Usa la build globale di OpenLayers (window.ol) — niente import
(function () {

  function getConfig() {
    var raw = (typeof window !== "undefined") ? window.__MAP_CONFIG__ : {};
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch (e) { raw = {}; } }
    console.log("[core] cfg letto:", raw);
    return raw || {};
  }

  // ---------- UI helper: banner avvisi non-bloccante ----------
  function showMapWarning(msg) {
    try {
      var host = document.getElementById("map-warnings");
      if (!host) {
        host = document.createElement("div");
        host.id = "map-warnings";
        host.style.position = "fixed";
        host.style.top = "12px";
        host.style.left = "50%";
        host.style.transform = "translateX(-50%)";
        host.style.zIndex = "9999";
        host.style.pointerEvents = "none";
        document.body.appendChild(host);
      }
      var box = document.createElement("div");
      box.textContent = msg;
      box.style.pointerEvents = "auto";
      box.style.margin = "6px 0";
      box.style.padding = "8px 12px";
      box.style.background = "rgba(220, 53, 69, 0.95)";   // rosso bootstrap-like
      box.style.color = "#fff";
      box.style.borderRadius = "4px";
      box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
      host.appendChild(box);
      setTimeout(function(){ if (box.parentNode) box.parentNode.removeChild(box); }, 6000);
    } catch(e) {
      console.warn("[core] Impossibile mostrare banner:", e);
    }
  }

  // ---------- Verifica URL (HEAD) prima di creare il layer ----------
  function checkUrlReachable(url) {
    // HEAD evita di scaricare il file; S3 deve permettere HEAD in CORS
    return fetch(url, { method: "HEAD", cache: "no-store", mode: "cors" })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  // ---------------- Basemaps ----------------
  function buildBasemaps(cfg) {
    var layers = [];
    var list = Array.isArray(cfg.basemaps) ? cfg.basemaps : [];

    for (var i = 0; i < list.length; i++) {
      var bm = list[i];
      var layer = null;

      if (bm.type === "osm") {
        layer = new ol.layer.Tile({
          title: bm.title || "OpenStreetMap",
          source: new ol.source.OSM(),
          visible: !!bm.visible
        });
      } else if (bm.type === "stamen-toner") {
        layer = new ol.layer.Tile({
          title: bm.title || "Stamen Toner",
          source: new ol.source.XYZ({
            url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
            attributions: "Stamen"
          }),
          visible: !!bm.visible
        });
      } else if (bm.type === "xyz" && bm.url) {
        layer = new ol.layer.Tile({
          title: bm.title || "XYZ",
          source: new ol.source.XYZ({
            url: bm.url,
            attributions: bm.attribution || ""
          }),
          visible: !!bm.visible
        });
      }

      if (layer) layers.push(layer);
    }

    if (layers.length === 0) {
      console.warn("[core] Nessun basemap dal YAML. Inject OSM fallback.");
      layers.push(new ol.layer.Tile({
        title: "OSM (fallback)",
        source: new ol.source.OSM(),
        visible: true
      }));
    }

    return layers;
  }

  // -------- Helpers WebGL style per COG --------
  function normExpr(bandIndex, minVal, maxVal) {
    return [
      'clamp',
      ['/', ['-', ['band', bandIndex], minVal], Math.max(1e-9, (maxVal - minVal))],
      0, 1
    ];
  }

  function rgbFromRawBands(bands) {
    var b1 = (bands && bands[0]) || 1;
    var b2 = (bands && bands[1]) || 2;
    var b3 = (bands && bands[2]) || 3;
    return ['array', ['band', b1], ['band', b2], ['band', b3], 1];
  }

  function rgbFromMinMax(bands, minArr, maxArr) {
    var b1 = (bands && bands[0]) || 1;
    var b2 = (bands && bands[1]) || 2;
    var b3 = (bands && bands[2]) || 3;
    return [
      'array',
      normExpr(b1, minArr[0], maxArr[0]),
      normExpr(b2, minArr[1], maxArr[1]),
      normExpr(b3, minArr[2], maxArr[2]),
      1
    ];
  }

  function grayscaleFallback(bandIndex) {
    var b = bandIndex || 1;
    return [
      'array',
      ['clamp', ['/', ['band', b], 255], 0, 1],
      ['clamp', ['/', ['band', b], 255], 0, 1],
      ['clamp', ['/', ['band', b], 255], 0, 1],
      1
    ];
  }

  function buildGeoTiffOptionsFromYaml(ly) {
    var opts = {
      sources: [{ url: ly.url }],
      interpolate: false,
      wrapX: false
    };
    if (typeof ly.normalize === "boolean") {
      opts.normalize = ly.normalize;
    }
    if (Array.isArray(ly.bands) && ly.bands.length > 0) {
      opts.bands = ly.bands;
    }
    if (typeof ly.convertToRGB === "boolean") {
      opts.convertToRGB = ly.convertToRGB;
    }
    if (Array.isArray(ly.min) && Array.isArray(ly.max)) {
      opts.min = ly.min;
      opts.max = ly.max;
    }
    if (ly.nodata != null) opts.nodata = ly.nodata;
    return opts;
  }

  function attachCogDiagnostics(src, layerTitle, onHardError) {
    src.on("change", function () {
      if (src.getState() === "ready") {
        try {
          var tg = src.getTileGrid();
          if (tg) console.log("[core] Estensione tileGrid:", tg.getExtent());
          var proj = src.getProjection();
          if (proj) console.log("[core] Proiezione COG:", proj.getCode ? proj.getCode() : proj);
        } catch (e) {
          console.warn("[core] Diagnostica COG non disponibile:", e);
        }
      } else if (src.getState() === "error") {
        console.error("[core] GeoTIFF source in stato ERROR per:", layerTitle);
        showMapWarning("Errore caricando “" + (layerTitle || "COG") + "”. Controlla l’URL o i permessi.");
        if (typeof onHardError === "function") onHardError();
        // TODO: estendere anche ad altri layer (GeoJSON, WMS, ecc.)
      }
    });
  }

  // --------------- Altri layer (COG, ecc.) ----------------
  function buildOtherLayers(cfg, map) {
    // NOTA: i COG vengono aggiunti in modo asincrono dopo il controllo HEAD
    var out = [];
    var list = Array.isArray(cfg.layers) ? cfg.layers : [];

    list.forEach(function (ly) {
      if (ly.type === "cog" && ly.url) {
        // Controllo preventivo URL
        checkUrlReachable(ly.url).then(function (ok) {
          if (!ok) {
            console.error("[core] URL non raggiungibile (HEAD fallita):", ly.url);
            showMapWarning("Impossibile caricare “" + (ly.title || "COG") + "”: URL non raggiungibile (404/403?).");
            // alert("Impossibile caricare il layer “" + (ly.title || "COG") + "”. Verifica l’URL.");
            return;
          }

          console.log("[core] Caricamento COG:", ly.url);
          var opts = buildGeoTiffOptionsFromYaml(ly);
          console.log("[core] Opzioni GeoTIFF (passo 1):", opts);

          var src = new ol.source.GeoTIFF(opts);

          var layer = new ol.layer.WebGLTile({
            title: ly.title || "COG Layer",
            source: src,
            visible: !!ly.visible,
            zIndex: (typeof ly.zIndex === "number") ? ly.zIndex : 100,
            // Stile: se normalize:true i band sono già 0..1 -> RGB diretto; altrimenti min/max o grayscale
            style: {
              color: (function () {
                var bands = Array.isArray(ly.bands) && ly.bands.length >= 3 ? ly.bands : [1, 2, 3];
                if (opts.normalize === true) {
                  return ['array', ['band', bands[0]], ['band', bands[1]], ['band', bands[2]], 1];
                }
                if (Array.isArray(ly.min) && Array.isArray(ly.max) && ly.min.length >= 3 && ly.max.length >= 3) {
                  return [
                    'array',
                    ['clamp', ['/', ['-', ['band', bands[0]], ly.min[0]], Math.max(1e-9, (ly.max[0] - ly.min[0]))], 0, 1],
                    ['clamp', ['/', ['-', ['band', bands[1]], ly.min[1]], Math.max(1e-9, (ly.max[1] - ly.min[1]))], 0, 1],
                    ['clamp', ['/', ['-', ['band', bands[2]], ly.min[2]], Math.max(1e-9, (ly.max[2] - ly.min[2]))], 0, 1],
                    1
                  ];
                }
                // Fallback in scala di grigi
                return [
                  'array',
                  ['clamp', ['/', ['band', bands[0]], 255], 0, 1],
                  ['clamp', ['/', ['band', bands[0]], 255], 0, 1],
                  ['clamp', ['/', ['band', bands[0]], 255], 0, 1],
                  1
                ];
              })()
            }
          });

          // Se dopo la creazione la sorgente va in errore, rimuovi il layer e avvisa
          attachCogDiagnostics(src, ly.title, function () {
            try { map.removeLayer(layer); } catch (_) {}
          });

          map.addLayer(layer);

          // Fit all’estensione quando pronto
          if (ly.zoom_to_extent) {
            var doFit = function () {
              if (src.getState() !== "ready") return;
              try {
                var srcProj = src.getProjection() || 'EPSG:3857';
                var tg = src.getTileGrid();
                var srcExtent = tg ? tg.getExtent() : null;
                if (srcExtent) {
                  var dstProj = map.getView().getProjection();
                  var fitExtent = ol.proj.transformExtent(srcExtent, srcProj, dstProj);
                  map.getView().fit(fitExtent, { duration: 800, padding: [40, 40, 40, 40] });
                  console.log("[core] COG extent (src):", srcExtent, "srcProj:", srcProj);
                  console.log("[core] COG extent (dst):", fitExtent, "dstProj:", dstProj.getCode());
                }
              } catch (e) {
                console.error("[core] Errore nel fit extent COG:", e);
              }
            };
            var onChange1 = function () {
              if (src.getState() === "ready") {
                src.un("change", onChange1);
                doFit();
              }
            };
            src.on("change", onChange1);
          }
        });
      }

      // TODO: qui in futuro gestire altri tipi di layer (GeoJSON, WMS, WMTS, VectorTile...)
      // E in caso di errore su queste sorgenti, riutilizzare la stessa strategia:
      // - HEAD/GET di verifica (se applicabile)
      // - ascolto state/error della source
      // - showMapWarning + rimozione layer
    });

    return out; // i COG vengono aggiunti async direttamente alla mappa
  }

  // ---------------- View helpers ----------------
  function parseCenter(cfg) {
    var def = [12.4964, 41.9028];
    if (!cfg.view || !Array.isArray(cfg.view.center)) return def;
    var c = cfg.view.center;
    if (c.length !== 2) return def;
    var lon = Number(c[0]), lat = Number(c[1]);
    if (!isFinite(lon) || !isFinite(lat)) return def;
    return [lon, lat];
  }

  function parseZoom(cfg) {
    var z = (cfg.view && typeof cfg.view.zoom === "number") ? cfg.view.zoom : 12;
    return isFinite(z) ? z : 12;
  }

  // ---------------- Create map ----------------
  function createMap(targetId) {
    var cfg = getConfig();

    var centerLonLat = parseCenter(cfg);
    var zoomVal = parseZoom(cfg);
    console.log("[core] view da cfg -> center:", centerLonLat, "zoom:", zoomVal);

    var view = new ol.View({
      center: ol.proj.fromLonLat([centerLonLat[0], centerLonLat[1]]),
      zoom: zoomVal
    });

    var basemaps = buildBasemaps(cfg);
    var map = new ol.Map({
      target: targetId,
      layers: basemaps,
      view: view,
      controls: [
        new ol.control.Zoom(),
        new ol.control.Attribution({ collapsible: true })
      ]
    });

    // COG e futuri layer vengono aggiunti async
    buildOtherLayers(cfg, map);

    // Scale bar
    var scaleTarget = document.getElementById("scale-container");
    if (scaleTarget) {
      map.addControl(new ol.control.ScaleLine({ target: scaleTarget }));
    }

    // Coordinate
    var coordsEl = document.getElementById("coords-container");
    if (coordsEl) {
      map.on("pointermove", function (evt) {
        if (evt.dragging) return;
        var lonlat = ol.proj.toLonLat(evt.coordinate);
        if (!lonlat) return;
        coordsEl.textContent = "Lon: " + lonlat[0].toFixed(5) + "  Lat: " + lonlat[1].toFixed(5);
      });
    }

    // Reset
    var resetWrap = document.querySelector("#map .reset-control");
    var resetBtn = document.getElementById("reset-view");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        map.getView().animate({
          center: ol.proj.fromLonLat([centerLonLat[0], centerLonLat[1]]),
          zoom: zoomVal,
          duration: 220
        });
      });
    }

    function alignResetUnderZoom() {
      if (!resetWrap) return;
      var zoomCtrl = null;
      map.getControls().forEach(function (c) {
        if (c instanceof ol.control.Zoom) zoomCtrl = c;
      });
      if (!zoomCtrl || !zoomCtrl.element) return;

      var mapRect = map.getTargetElement().getBoundingClientRect();
      var zoomRect = zoomCtrl.element.getBoundingClientRect();
      var top = (zoomRect.bottom - mapRect.top) + 8;
      var left = (zoomRect.left - mapRect.left);

      resetWrap.style.top = top + "px";
      resetWrap.style.left = left + "px";
    }
    map.once("postrender", alignResetUnderZoom);
    window.addEventListener("resize", alignResetUnderZoom);
    setTimeout(alignResetUnderZoom, 0);

    // Basemap select
    var selectEl = document.getElementById("basemap-select");
    if (selectEl) {
      selectEl.innerHTML = "";
      basemaps.forEach(function (lyr, idx) {
        var opt = document.createElement("option");
        var title = lyr.get("title") || ("Basemap " + (idx + 1));
        opt.value = title;
        opt.textContent = title;
        if (lyr.getVisible()) opt.selected = true;
        selectEl.appendChild(opt);
      });

      selectEl.addEventListener("change", function () {
        var val = selectEl.value;
        basemaps.forEach(function (lyr) { lyr.setVisible(false); });
        var hit = basemaps.find(function (lyr) { return (lyr.get("title") || "") === val; });
        if (hit) hit.setVisible(true);
      });
    }

    // safety: almeno un basemap visibile
    var anyVisible = basemaps.some(function (l) { return l.getVisible(); });
    if (!anyVisible && basemaps.length > 0) basemaps[0].setVisible(true);

    setTimeout(function () { map.updateSize(); }, 0);
    return map;
  }

  window.WebMapCore = { createMap: createMap };
})();
