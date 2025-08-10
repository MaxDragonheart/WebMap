window.__MAP_CONFIG__ = {
  center: [14.2514907836644354, 40.84578475094159],
  zoom: 12,
  basemaps: {
    list: [
      { id: 'osm', name: 'OSM', type: 'osm' },
      {
        id: 'esri_sat', name: 'Esri Sat', type: 'xyz',
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles © Esri'
      }
    ],
    defaultBasemap: 'osm'
  },
  controls: {
    fullscreen: true,
    scaleLine: true,
    slider: false
  },
  popup: { enabled: true, content: 'Lon: {lon}, Lat: {lat}' }
};
