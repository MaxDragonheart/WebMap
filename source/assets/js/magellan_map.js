function zoomOnStory(pointDict) {
  // console.log(pointDict);
  map.on('singleclick', function(evt) {

    attributeTable = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
      return feature;
    });

    if(attributeTable instanceof ol.Feature){

      map.getView().setCenter(ol.extent.getCenter(attributeTable.getGeometry().getExtent()));
      map.getView().setZoom(14);

    }

    if (attributeTable) {

      // highlightStyle = new ol.style.Style({
      //     image: new ol.style.Circle({
      //       radius: 10,
      //       stroke: new ol.style.Stroke({
      //           color: 'rgb(255, 255, 255)',
      //           width: 2
      //       }),
      //       fill: new ol.style.Fill({
      //         color: 'rgb(255,0,0)',
      //       })
      //     })
      // });
      //
      // attributeTable.setStyle(highlightStyle);

      // text = new ol.style.Style({
      //     text: new ol.style.Text({
      //       text: 'CIAO',
      //       fill: new ol.style.Fill({
      //         color: '#fff',
      //       }),
      //     })
      //   });
      // attributeTable.setStyle(text);

      const fid = attributeTable.get('pk');

      for (var key in pointDict) {
        if (fid == pointDict[key].id) {
          let value = pointDict[key].modal_name;
          // console.log(value);

          $('#'+value).offcanvas('show');
        }
      }

    } else {
      // TODO ripristinare lo stile di default
    }

  });
};

function zoomOnCoordinates(arrayCoordinates) {

  clickedPoint = ol.proj.fromLonLat(arrayCoordinates)

  function flyTo(location, done) {
    const duration = 2000;
    const zoom = 16;
    let parts = 2;
    let called = false;
    function callback(complete) {
      --parts;
      if (called) {
        return;
      }
      if (parts === 0 || !complete) {
        called = true;
        done(complete);
      }
    }
    view.animate(
      {
        center: location,
        duration: duration,
      },
      callback
    );
    view.animate(
      {
        zoom: 8,
        duration: duration / 2,
      },
      {
        zoom: zoom,
        duration: duration,
      },
      callback
    );
  }
  flyTo(clickedPoint, function () {});

};
