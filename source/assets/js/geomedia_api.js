let vectorsLayerAPI = function(
  vectorType,
  urlAPI,
  vectorsLayerName
){
  this.vectorType = vectorType;
  this.urlAPI = urlAPI;
  this.vectorsLayerName = vectorsLayerName;

  let layerVectorAPI;

  return {
    'createVectorAPI': function(
      attr,
      setStrokeColor,
      setStrokeLineDashLength,
      setStrokeLineDashSpace,
      setStrokeWidth,
      setFillColor,
      setMaxZoom,
      setMinZoom,
      setZIndex,
      setOpacity
    ){
      this.attr = attr;
      this.setStrokeColor = setStrokeColor;
      this.setStrokeLineDashLength = setStrokeLineDashLength;
      this.setStrokeLineDashSpace = setStrokeLineDashSpace;
      this.setStrokeWidth = setStrokeWidth;
      this.setFillColor = setFillColor;
      this.setMaxZoom = setMaxZoom;
      this.setMinZoom = setMinZoom;
      this.setZIndex = setZIndex;
      this.setOpacity = setOpacity;

      let stroke, fill;
      // Vector's style definition.
      stroke = new ol.style.Stroke({
          color: setStrokeColor,
          width: setStrokeWidth,
          lineDash: [setStrokeLineDashLength, setStrokeLineDashSpace],
          lineCap: 'butt',
          lineJoin: 'miter'
      });
      fill = new ol.style.Fill({
        color: setFillColor,
      });

      let style;
      // Change style based on the geometry type.
      if (vectorType.toLowerCase() === 'polygon') {
        style = new ol.style.Style({
            stroke: stroke,
            fill: fill
        });
      } else if (vectorType.toLowerCase() === 'linestring') {
        style = new ol.style.Style({
            stroke: stroke
        });
      } else if (vectorType.toLowerCase() === 'point') {
        style = new ol.style.Style({
            image: new ol.style.Circle({
              radius: setStrokeWidth * 5,
              stroke: stroke,
              fill: fill
            })
        });
      } else {
        console.error('Geometry not recognized! Accepted geometries: point, linestring, polygon.');
      }
      // Build the vector
      layerVector = new ol.layer.Vector({
        title: vectorsLayerName,
        source: new ol.source.Vector(),
        style: style,
        minZoom: setMinZoom,
        maxZoom: setMaxZoom,
        zIndex: setZIndex,
        opacity: setOpacity
      });
      async function getFeatureProperties() {
        try {
          let response = await fetch(urlAPI);
          if (!response.ok) {
            throw new Error(`HTTP error!\n Status: ${response.status}\n Type: ${response.type}\n URL: ${response.url}`);
          } else {
            let data = await response.text();
            let json;
            // console.log(json);
            if (attr !== null) {
              json = JSON.parse(data)[attr];
            } else {
              json = JSON.parse(data)
            }
            const features = new ol.format.GeoJSON({
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857'
            }).readFeatures(json);
            layerVector.getSource().addFeatures(features);
          }
        } catch (e) {
          console.log(e);
        }
      }
      getFeatureProperties();

      return layerVector;
    },
    'zoomToExtent': function(
      paddingTop,
      paddingLeft,
      paddingBottom,
      paddingRight,
      durationMilliseconds
    ){
      /*
      This function allow to zoom on the target vector's extent.
      paddingTop: integer. It is the top padding.
      paddingLeft: integer. It is the left padding.
      paddingBottom: integer. It is the bottom padding.
      paddingRight: integer. It is the right padding.
      durationMilliseconds: integer. Corresponds to how long the zoom lasts.
      */
      this.paddingTop = paddingTop;
      this.paddingLeft = paddingLeft;
      this.paddingBottom = paddingBottom;
      this.paddingRight = paddingRight;
      this.durationMilliseconds = durationMilliseconds;

      layerVector.getSource().once('change', function(evt) {
        if (layerVector.getSource().getState() === 'ready') {
          if (layerVector.getSource().getFeatures().length > 0) {
            const extent = layerVector.getSource().getExtent();
            const options = {
              size: map.getSize(),
              padding: [paddingTop, paddingLeft, paddingBottom, paddingRight],
              duration: durationMilliseconds
            }
            map.getView().fit(extent, options);
          }
        }
      });
    },
    'zoomOnLayer': function(
      paddingTop,
      paddingLeft,
      paddingBottom,
      paddingRight,
      durationMilliseconds
    ){
      /*
      This function activates the zoom by clicking on the button.
      paddingTop: integer. It is the top padding.
      paddingLeft: integer. It is the left padding.
      paddingBottom: integer. It is the bottom padding.
      paddingRight: integer. It is the right padding.
      durationMilliseconds: integer. Corresponds to how long the zoom lasts.
      */
      this.paddingTop = paddingTop;
      this.paddingLeft = paddingLeft;
      this.paddingBottom = paddingBottom;
      this.paddingRight = paddingRight;
      this.durationMilliseconds = durationMilliseconds;

      const extent = layerVector.getSource().getExtent();
      const options = {
        size: map.getSize(),
        padding: [paddingTop, paddingLeft, paddingBottom, paddingRight],
        duration: durationMilliseconds
      }
      map.getView().fit(extent, options);
    },
    'lockToExtent': function(
      paddingTop,
      paddingLeft,
      paddingBottom,
      paddingRight
    ){
      /*
      This function activates lock on the vector's target extent.
      paddingTop: integer. It is the top padding.
      paddingLeft: integer. It is the left padding.
      paddingBottom: integer. It is the bottom padding.
      paddingRight: integer. It is the right padding.
      */
      this.paddingTop = paddingTop;
      this.paddingLeft = paddingLeft;
      this.paddingBottom = paddingBottom;
      this.paddingRight = paddingRight;

      layerVector.getSource().once('change', function(evt) {
        if (layerVector.getSource().getState() === 'ready') {
          if (layerVector.getSource().getFeatures().length > 0) {
            const extent = layerVector.getSource().getExtent();
            const options = {
              size: map.getSize(),
              padding: [paddingTop, paddingLeft, paddingBottom, paddingRight],
            }
            map.getView().fit(extent, options);

            const newView = new View({
              extent: extent,
              showFullExtent: true,
              center: map.getView().getCenter(),
              zoom: map.getView().getZoom()
            });
            map.setView(newView);
          }
        }
      });
    },
  };
};
