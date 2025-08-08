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

  // Stato globale per basemap
  const BASEMAPS = {}; // id -> TileLayer

  // ===== Helpers =====
  function normalizeConfig(cfg) {
    if (!cfg) return {};
    if (typeof cfg === "string") {
      try { return JSON.parse(cfg); } catch { return {}; }
    }
    return cfg;
  }

  function createBasemapLayer(def) {
    if (!def || !def.type) {
      return new TileLayer({ source: new OSM(), visible: true });
    }
    if (def.type === "osm") {
      return new TileLayer({ source: new OSM(), visible: !!def.visible });
    }
    if (def.type === "xyz" && def.url) {
      return new TileLayer({
        source: new XYZ({
          url: def.url,
          attributions: def.attribution || ""
        }),
        visible: !!def.visible
      });
    }
    // fallback
    return new TileLayer({ source: new OSM(), visible: !!def.visible });
  }

  function buildBasemaps(config) {
    // Supporta sia .basemap singolo, sia .basemaps[]
    let defs = [];
    if (Array.isArray(config.basemaps) && config.basemaps.length > 0) {
      defs = config.basemaps;
    } else {
      // fallback minimale
      defs = [{
        id: "osm",
        name: "OpenStreetMap",
        type: "osm"
      },{
        id: "esri_sat",
        name: "Esri World Imagery",
        type: "xyz",
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Tiles © Esri"
      }];
    }

    const wanted = config.defaultBasemap || defs[0].id;
    const layers = [];
    // reset
    Object.keys(BASEMAPS).forEach(k => delete BASEMAPS[k]);

    defs.forEach(d => {
      const layer = createBasemapLayer({ ...d, visible: d.id === wanted });
      BASEMAPS[d.id] = layer;
      layers.push(layer);
    });
    return layers;
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

    map.on("pointermove", function (evt) {
      const hit = map.hasFeatureAtPixel(evt.pixel);
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    map.on("singleclick", function (evt) {
      let handled = false;
      map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        const props = feature.getProperties();
        const lonlat = props.lonlat || toLonLat(feature.getGeometry().getCoordinates());
        const html = formatPopupHTML(props.popup || template, {
          name: props.name, lon: lonlat[0], lat: lonlat[1],
        });
        content.innerHTML = html;
        overlay.setPosition(evt.coordinate);
        handled = true;
        return true;
      });
      if (!handled) overlay.setPosition(undefined);
    });
    return overlay;
  }

  // ===== API pubbliche utili =====
  function setBasemap(id) {
    Object.keys(BASEMAPS).forEach(key => {
      BASEMAPS[key].setVisible(key === id);
    });
  }

  function initBasemapRadios(containerId, cfg) {
    const box = document.getElementById(containerId);
    if (!box) return;

    const defs = (Array.isArray(cfg.basemaps) && cfg.basemaps.length > 0)
      ? cfg.basemaps
      : [
          { id: "osm", name: "OSM", type: "osm" },
          { id: "esri_sat", name: "Esri Sat", type: "xyz",
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: "Tiles © Esri"
          }
        ];
    const defId = cfg.defaultBasemap || defs[0].id;

    // pulisci e crea radio
    box.innerHTML = "";
    defs.forEach(d => {
      const wrap = document.createElement("label");
      wrap.className = "bm-item";
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = "basemap";
      inp.value = d.id;
      if (d.id === defId) inp.checked = true;
      const txt = document.createElement("span");
      txt.textContent = d.name || d.id;
      wrap.appendChild(inp);
      wrap.appendChild(txt);
      box.appendChild(wrap);

      inp.addEventListener("change", function () {
        if (this.checked) setBasemap(this.value);
      });
    });

    // mostra il container
    box.removeAttribute("hidden");
  }

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

  // ===== Factory principale =====
  function createMap(rawConfig, targetId, ids) {
    const config = normalizeConfig(rawConfig);
    const center = fromLonLat(config.center || [14.25141, 40.84578]);
    const zoom = typeof config.zoom === "number" ? config.zoom : 12;

    const basemapLayers = buildBasemaps(config);
    const rasterLayer = createRasterLayer(config.raster);
    const pointsLayer = createPointsLayer(config.points);

    const layers = [...basemapLayers];
    if (rasterLayer) layers.push(rasterLayer);
    if (pointsLayer) layers.push(pointsLayer);

    const map = new Map({
      target: targetId,
      layers,
      view: new View({ center, zoom })
    });

    // Controlli (stile OL classico; CSS li personalizza)
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

  // Exports
  window.createMap = createMap;
  window.getMouseCoordinates = getMouseCoordinates;
  window.createBBoxLayer = createBBoxLayer;
  window.zoomOnLayer = zoomOnLayer;
  window.setBasemap = setBasemap;
  window.initBasemapRadios = initBasemapRadios;
})();
