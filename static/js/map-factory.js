// static/js/map-factory.js
(function () {
  // --- OpenLayers UMD refs (v7.x) ---
  const Map = ol.Map;
  const View = ol.View;

  const OSM = ol.source.OSM;
  const XYZ = ol.source.XYZ;
  const GeoTIFF = ol.source.GeoTIFF;
  const VectorSource = ol.source.Vector;

  const TileLayer = ol.layer.Tile;
  const ImageLayer = ol.layer.Image;
  const VectorLayer = ol.layer.Vector;

  const ZoomControl = ol.control.Zoom;
  const FullScreen = ol.control.FullScreen;
  const ScaleLine = ol.control.ScaleLine;

  const fromLonLat = ol.proj.fromLonLat;
  const toLonLat = ol.proj.toLonLat;

  const Overlay = ol.Overlay;
  const Feature = ol.Feature;
  const Point = ol.geom.Point;
  const Polygon = ol.geom.Polygon;

  const Style = ol.style.Style;
  const CircleStyle = ol.style.Circle;
  const Fill = ol.style.Fill;
  const Stroke = ol.style.Stroke;
  const Text = ol.style.Text;

  // ========== Helpers ==========
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
    return new TileLayer({ source: new OSM() });
  }

  function createRasterLayer(cfg) {
    if (!cfg || !cfg.enabled) return null;
    if (cfg.type === "geotiff" && cfg.url) {
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

  // ========== Funzioni misura (dai tuoi JS) ==========
  function formatLength(line) {
    const length = ol.sphere.getLength(line);
    return length > 100
      ? (Math.round((length / 1000) * 100) / 100) + " km"
      : (Math.round(length * 100) / 100) + " m";
  }

  function formatArea(polygon) {
    const area = ol.sphere.getArea(polygon);
    return area > 10000
      ? (Math.round((area / 1000000) * 100) / 100) + " km²"
      : (Math.round(area * 100) / 100) + " m²";
  }

  function addMeasureInteraction(map, type, outputId) {
    const source = new VectorSource();
    const draw = new ol.interaction.Draw({
      source,
      type,
      style: new Style({
        fill: new Fill({ color: 'rgba(255,255,255,0.2)' }),
        stroke: new Stroke({ color: 'rgba(0,255,0,1)', lineDash: [10, 10], width: 2 }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({ color: 'rgba(0,0,0,0.7)' }),
          fill: new Fill({ color: 'rgba(255,255,255,0.2)' })
        })
      })
    });
    map.addInteraction(draw);
    draw.on('drawstart', function (evt) {
      const sketch = evt.feature;
      sketch.getGeometry().on('change', function (ev) {
        const geom = ev.target;
        const out = geom instanceof Polygon ? formatArea(geom) : formatLength(geom);
        const el = document.getElementById(outputId);
        if (el) el.innerHTML = out;
      });
    });
  }

  // ========== Utility (dai tuoi JS) ==========
  function getMouseCoordinates(map, lonId, latId) {
    map.on('pointermove', function (event) {
      const coordinate = toLonLat(event.coordinate);
      const lon = coordinate[0].toFixed(5);
      const lat = coordinate[1].toFixed(5);
      const elLon = document.getElementById(lonId);
      const elLat = document.getElementById(latId);
      if (elLon) elLon.innerHTML = lon;
      if (elLat) elLat.innerHTML = lat;
    });
  }

  function createBBoxLayer(bboxCoordinates, bboxName) {
    const coords = [[
      [bboxCoordinates[0], bboxCoordinates[1]],
      [bboxCoordinates[0], bboxCoordinates[3]],
      [bboxCoordinates[2], bboxCoordinates[3]],
      [bboxCoordinates[2], bboxCoordinates[1]],
      [bboxCoordinates[0], bboxCoordinates[1]],
    ]];
    const polygon = new Feature(
      new Polygon(coords).transform('EPSG:4326','EPSG:3857')
    );
    return new VectorLayer({
      title: bboxName,
      source: new VectorSource({ features: [polygon] }),
      opacity: 0
    });
  }

  function zoomOnLayer(map, layer, padding = [20, 20, 20, 20], duration = 500) {
    const extent = layer.getSource().getExtent();
    map.getView().fit(extent, { size: map.getSize(), padding, duration });
  }

  // ========== Factory principale ==========
  function createMap(rawConfig, targetId, ids) {
    const config = normalizeConfig(rawConfig);

    const center = fromLonLat(config.center || [14.25141, 40.84578]);
    const zoom = typeof config.zoom === "number" ? config.zoom : 12;

    const baseLayer = createBasemap(config.basemap);
    const rasterLayer = createRasterLayer(config.raster);
    const pointsLayer = createPointsLayer(config.points);

    const layers = [baseLayer];
    if (rasterLayer) layers.push(rasterLayer);
    if (pointsLayer) layers.push(pointsLayer);

    // NIENTE defaults(): lasciamo che OL aggiunga i controlli base automaticamente
    const map = new Map({
      target: targetId,
      layers,
      view: new View({ center, zoom })
    });

    // Alcuni bundle UMD non inseriscono automaticamente lo Zoom: lo aggiungo in modo esplicito
    map.addControl(new ZoomControl());
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

  // export globali
  window.createMap = createMap;
  window.addMeasureInteraction = addMeasureInteraction;
  window.getMouseCoordinates = getMouseCoordinates;
  window.createBBoxLayer = createBBoxLayer;
  window.zoomOnLayer = zoomOnLayer;
})();
