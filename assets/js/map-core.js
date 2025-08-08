// Core: crea mappa, layer di base da config e utilità
window.WebMap = (function () {
  function createView(cfg) {
    const center = cfg?.view?.center || [12.4964, 41.9028]; // Roma
    const zoom = cfg?.view?.zoom ?? 12;

    return new ol.View({
      center: ol.proj.fromLonLat(center),
      zoom
    });
  }

  function basemapFromConfig(base) {
    // supporto esempi: osm, stamen-toner, xyz custom
    if (base.type === "osm") {
      return new ol.layer.Tile({ title: base.title || "OSM", source: new ol.source.OSM(), visible: !!base.visible });
    }
    if (base.type === "stamen-toner") {
      return new ol.layer.Tile({
        title: base.title || "Stamen Toner",
        source: new ol.source.XYZ({ url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png", attributions: "Stamen" }),
        visible: !!base.visible
      });
    }
    if (base.type === "xyz") {
      return new ol.layer.Tile({
        title: base.title || "XYZ",
        source: new ol.source.XYZ({ url: base.url, attributions: base.attribution || "" }),
        visible: !!base.visible
      });
    }
    console.warn("Unknown basemap type:", base);
    return null;
  }

  function buildBasemapGroup(cfg) {
    const bases = (cfg?.basemaps || []).map(basemapFromConfig).filter(Boolean);
    return new ol.layer.Group({ title: "Basemaps", layers: bases });
  }

  function createMap(targetId, cfg) {
    const view = createView(cfg);
    const basemapGroup = buildBasemapGroup(cfg);

    const map = new ol.Map({
      target: targetId,
      layers: [basemapGroup],
      view
    });

    return { map, basemapGroup };
  }

  function currentScale(map) {
    const resolution = map.getView().getResolution();
    const dpi = 25.4 / 0.28; // 90.714... default OL DPI
    const mpu = ol.proj.get(map.getView().getProjection()).getMetersPerUnit();
    const scale = resolution * mpu * 39.37 * dpi; // 1 inch = 0.0254 m; 39.37 inch/m
    return Math.round(scale);
  }

  return { createMap, currentScale };
})();
