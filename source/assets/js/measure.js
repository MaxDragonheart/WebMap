const source = new ol.source.Vector({wrapX: false});

const vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)',
    }),
    stroke: new ol.style.Stroke({
      color: '#ffcc33',
      width: 2,
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#ffcc33',
      }),
    }),
  }),
});
map.addLayer(vector);

let draw; // global so we can remove it later
function addInteractionLineString() {

    draw = new ol.interaction.Draw({
      source: source,
      type: 'LineString',
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2,
        }),
        image: new ol.style.Circle({
          radius: 5,
          stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
        }),
      }),
    });

}

addInteractionLineString();