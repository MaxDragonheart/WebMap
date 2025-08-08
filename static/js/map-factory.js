// static/js/map-factory.js
(function () {
  // --- OpenLayers UMD refs (v7.x) ---
  const Map = ol.Map;
  const View = ol.View;

  const OSM = ol.source.OSM;
  const XYZ = ol.source.XYZ;
  const GeoTIFF = ol.source.GeoTIFF;

  const TileLayer = ol.layer.Tile;
  const ImageLayer = ol.layer.Image;
  const VectorLayer = ol.layer.Vector;

  const VectorSource = ol.source.Vector;

  const FullScreen = ol.control.FullScreen;
  const ScaleLine = ol.control.ScaleLine;

  const fromLonLat = ol.proj.fromLonLat;
  const toLonLat = ol.proj.toLonLat;

  const Overlay = ol.Overlay;
  const Feature = ol.Feature;
  const Point = ol.geom.Point;

  const Style = ol.style.Style;
  const CircleStyle = ol.style.Circle;
  const Fill = ol.style.Fill;
  const Stroke = ol.style.Stroke;
  const Text = ol.style.Text;

  // --- Helpers ---
  function normalizeConfig(cfg) {
    if (!cfg) return {};
    if (typeof cfg === "string") {
      try { return JSON.parse(cfg); } catch { return {}; }
    }
    return cfg;
  }

  function createBasemap(cfg) {
    if (cfg && cfg.type === "xyz" && cfg.url) {
      return new TileLayer({
        source: new XYZ({
          url: cfg.url,
          attributions: cfg.attribution || "",
        }),
      });
    }
    // default OSM
    return new TileLayer({ source: new OSM() });
  }

  function createRasterLayer(cfg) {
    if (!cfg || !cfg.enabled) return null;
    if (cfg.type === "geotiff" && cfg.url) {
      // COG via HTTP range (ricorda CORS su S3)
      const src = new GeoTIFF({
        sources: [{ url: cfg.url }],
        convertToRGB: true,
      });
      return new ImageLayer({
        source: src,
        opacity: typeof cfg.opacity === "number" ? cfg.opacity : 1,
      });
    }
    return null;
  }

  function createPointsLayer(points) {
    if (!Array.isArray(points) || points.length === 0) return null;

    const source = new VectorSource();
    points.forEach((p) => {
      if (!Array.isArray(p.coord) || p.coord.length !== 2) return;
      const feat = new Feature({
        geometry: new Point(fromLonLat(p.coord)),
        name: p.name || "Punto",
        popup: p.popup || null,
        lonlat: p.coord,
      });
      source.addFeature(feat);
    });

    const style = new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "rgba(0,122,255,0.9)" }),
        stroke: new Stroke({ color: "#fff", width: 2 }),
      }),
      text: new Text({
        text: "",
        offsetY: -14,
        fill: new Fill({ color: "#111" }),
        stroke: new Stroke({ color: "#fff", width: 3 }),
      }),
    });

    return new VectorLayer({ source, style, zIndex: 10 });
  }

  function attachOpacitySlider(layer, sliderId) {
    if (!layer || !sliderId) return;
    const el = document.getElementById(sliderId);
    if (!el) return;
    el.addEventListener("input", () => {
      const v = parseFloat(el.value);
      layer.setOpacity(isNaN(v) ? 1 : v);
    });
  }

  function formatPopupHTML(template, payload) {
    return (template || "Lon: {lon}, Lat: {lat}")
      .replace("{name}", payload.name ?? "")
      .replace("{lon}", payload.lon?.toFixed ? payload.lon.toFixed(6) : payload.lon)
      .replace("{lat}", payload.lat?.toFixed ? payload.lat.toFixed(6) : payload.lat);
  }

  function createPopup(map, ids, template) {
    const container = document.getElementById(ids.popupContainerId);
    const closer = document.getElementById(ids.popupCloserId);
    const content = document.getElementById(ids.popupContentId);
    if (!container || !closer || !content) return;

    const overlay = new Overlay({
      element: container,
      autoPan: { animation: { duration: 250 } },
    });
    map.addOverlay(overlay);

    closer.onclick = function () {
      overlay.setPosition(undefined);
      closer.blur();
      return false;
    };

    // cursore "mano" su feature
    map.on("pointermove", function (evt) {
      const hit = map.hasFeatureAtPixel(evt.pixel);
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    // popup SOLO su feature
    map.on("singleclick", function (evt) {
      let handled = false;
      map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        const props = feature.getProperties();
        const lonlat = props.lonlat || toLonLat(feature.getGeometry().getCoordinates());
        const html = formatPopupHTML(props.popup || template, {
          name: props.name,
          lon: lonlat[0],
          lat: lonlat[1],
        });
        content.innerHTML = html;
        overlay.setPosition(evt.coordinate);
        handled = true;
        return true; // stop iteration
      });
      if (!handled) overlay.setPosition(undefined);
    });

    return overlay;
  }

  function createMap(rawConfig, targetId, ids) {
    const config = normalizeConfig(rawConfig);

    const center = fromLonLat(config.center || [14.25141, 40.84578]); // Napoli default
    const zoom = typeof config.zoom === "number" ? config.zoom : 12;

    const baseLayer = createBasemap(config.basemap);
    const rasterLayer = createRasterLayer(config.raster);
    const pointsLayer = createPointsLayer(config.points);

    const layers = [baseLayer];
    if (rasterLayer) layers.push(rasterLayer);
    if (pointsLayer) layers.push(pointsLayer);

    // NIENTE controls nel costruttore → usa i default interni
    const map = new Map({
      target: targetId,
      layers,
      view: new View({ center, zoom })
    });

    // Aggiungi controlli opzionali dopo
    if (config.controls?.scaleLine) map.addControl(new ScaleLine());
    if (config.controls?.fullscreen) map.addControl(new FullScreen());

    if (config.controls?.slider && rasterLayer) {
      attachOpacitySlider(rasterLayer, ids.opacitySliderId);
    }
    if (config.popup?.enabled) {
      createPopup(map, ids, config.popup?.content);
    }
    return map;
  }

  // export globale
  window.createMap = createMap;
})();
