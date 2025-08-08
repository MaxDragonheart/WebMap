function getMouseCoordinates(){
  map.on('pointermove', function (event) {
    const coordinate = ol.proj.toLonLat(event.coordinate);
    // console.log(coordinate);
    const lon = coordinate[0].toFixed(5);
    document.getElementById("lon").innerHTML = lon;
    const lat = coordinate[1].toFixed(5);
    document.getElementById("lat").innerHTML = lat;
  });
};

function createBBoxLayer(bboxCoordinates, bboxName){

  // Build the vector
  const coordinates = [[
    [bboxCoordinates[0], bboxCoordinates[1]],
    [bboxCoordinates[0], bboxCoordinates[3]],
    [bboxCoordinates[2], bboxCoordinates[3]],
    [bboxCoordinates[2], bboxCoordinates[1]],
    [bboxCoordinates[0], bboxCoordinates[1]],
  ]];
  const polygon = new ol.Feature(
    new ol.geom.Polygon(coordinates).transform('EPSG:4326','EPSG:3857')
  );
  const bbox = new ol.layer.Vector({
    title: bboxName,
    source: new ol.source.Vector({
        features: [polygon]
    }),
    opacity: 0
  });

  return bbox;

};

function zoomOnLayer(
  layerName,
  paddingTop,
  paddingLeft,
  paddingBottom,
  paddingRight,
  durationMilliseconds
){

  var extent = layerName.getSource().getExtent();
  var options = {
    size: map.getSize(),
    padding: [paddingTop, paddingLeft, paddingBottom, paddingRight],
    duration: durationMilliseconds
  }
  map.getView().fit(extent, options);

};

function layerOpacity(layerName, elementID, outputID){
  var control = document.getElementById(elementID);
  var output = document.getElementById(outputID);
  var listener = function () {
    output.innerText = control.value;
    layerName.setOpacity(control.value / 100);
  };
  control.addEventListener('input', listener);
  control.addEventListener('change', listener);
  output.innerText = control.value;
  layerName.setOpacity(control.value / 100);
};

function layerZIndex(layerName, elementID, outputID){
  var control = document.getElementById(elementID);
  var output = document.getElementById(outputID);
  var listener = function () {
    layerName.setZIndex(control.value);
  };
  control.addEventListener('input', listener);
  control.addEventListener('change', listener);
  layerName.setZIndex(control.value);
};

function getElementInfo(elementID, layerName, layerTitle){
  map.on('singleclick', function (event) {
    var viewResolution = view.getResolution();
    var coordinates = event.coordinate;
    var epsg = 'EPSG:3857';
    var params = {
        'INFO_FORMAT': 'application/json'
      };
    var url = layerName.getSource().getFeatureInfoUrl(
      coordinates,
      viewResolution,
      epsg,
      params,
    );
    // console.log(url);
    async function getFeatureProperties() {
      try {
        var response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error!\n Status: ${response.status}\n Type: ${response.type}\n URL: ${response.url}`);
        } else {
          const data = await response.text();
          const parsed = JSON.parse(data);
          if (!parsed.features || !parsed.features[0]) {
            alert('Nessuna informazione disponibile per questo elemento.');
            return;
          }
          const json = parsed.features[0].properties;

          const tableHeadContents = '<thead>'
          // + '<tr><th colspan="2">' + layerTitle + '</th></tr>'
          // + '<tr><th>#</th><th>Info</th></tr>'
          + '</thead>';
          const tableHead = $(tableHeadContents).attr("id","thead");
          $("#"+elementID).html('');
          $("#"+elementID).append(tableHead);
          const tableBodyContents = '<tbody></tbody>';
          const tableBody = $(tableBodyContents).attr("id","tbody"+elementID);
          $("#"+elementID).append(tableBody);
          for (const key in json) {
            const value = json[key];
            const tableRow = '<tr><td class="td-head">' + key + '</td><td class="td-body">' + value + '</td></tr>';
            $("#tbody"+elementID).append(tableRow);
          }

        }
      } catch (e) {
        console.error(e);
      }
    }
    getFeatureProperties();
  });
};

function removeElementInfo(elementID){
  $("#"+elementID).remove();
};

function getElementLegendImg(elementID, layerName, url, layer) {

  const updateLegend = function(resolution) {
    const divLegend = $("<div/>").attr("id","imgLegend"+elementID);
    $("#"+elementID).append(divLegend);
    // var legendImg = "https://geoserver.massimilianomoraca.me/geoserver/MassimilianoMoraca/wms/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=edificicasalnuovo"
    const legendImg = url + "?REQUEST=GetLegendGraphic&VERSION=2.0.0&FORMAT=image/png&LAYER=" + layer
    // console.log(legendImg);
    $("#imgLegend"+elementID).html('');
    $("#imgLegend"+elementID).append('<img class="legend-img" src=' + legendImg + '>')
  };

  const viewResolution = view.getResolution();
  updateLegend(viewResolution);

};

function getElementLegend(elementID, layerName) {

  const updateLegend = function(resolution) {
    const params = {
        'FORMAT': 'application/json'
      };
    const url = layerName.getSource().getLegendUrl(resolution, params);
    // console.log(url);

    async function getFeatureProperties() {
      try {
        const response = await fetch(url);
        // console.log(response);
        if (!response.ok) {
          throw new Error(`HTTP error!. Status: ${response.status}`);
        } else {
          const data = await response.text();
          const legendJSON = JSON.parse(data).Legend[0].rules[0].symbolizers[0];
          // console.log(legendJSON);

            if (legendJSON.Raster) {

              // Legend for raster data
              const legendData = legendJSON.Raster.colormap.entries;
              if (legendData !== undefined) {
                const divLegend = $("<div/>").attr("id","indexLegend");
                $("#"+elementID).append(divLegend);
                const arrayColors = [];
                const arrayLabels = [];
                for (const item in legendData){
                  const colors = legendData[item]["color"]
                  // console.log(colors);
                  arrayColors.push(colors);

                  const labels = legendData[item]["label"]
                  // console.log(labels);
                  arrayLabels.push(labels);
                }
                const divLabelFirst = '<div class="legend-info">' + arrayLabels[0] + '</div>'
                const divColor = '<div class="legend-colormap" style="background-image: linear-gradient(to right, ' + arrayColors + ');"></div>'
                const divLabelLast = '<div class="legend-info">' + arrayLabels[arrayLabels.length - 1] + '</div>'
                $("#indexLegend").html('');
                $("#indexLegend").append('<div class="legend-contents" id="">' + divLabelFirst + divColor + divLabelLast + '</div>')
              } else {
                console.error('legendData is undefined!');
              }

            } else if (legendJSON.Line) {

              // Legend for linestring data
              const legendData = legendJSON.Line;
              if (legendData !== undefined) {
                const divLegend = $("<div/>").attr("id","indexLegend");
                $("#"+elementID).append(divLegend);

                const strokeColor = legendData.stroke;

                $("#indexLegend").html('');
                $("#indexLegend").append('<div style="background-color:' + strokeColor + '; width: 2vw; height: 2vh;"></div>')
              } else {
                console.error('legendData is undefined!');
              }

              } else if (legendJSON.Polygon) {

                // Legend for polygon data
                const legendData = legendJSON.Polygon;
                if (legendData !== undefined) {
                  const divLegend = $("<div/>").attr("id","indexLegend");
                  $("#"+elementID).append(divLegend);

                  const fillColor = legendData.fill;
                  const strokeColor = legendData.stroke;

                  $("#indexLegend").html('');
                  $("#indexLegend").append('<div style="background-color:' + fillColor + '; width: 2vw; height: 2vh; border-color: ' + strokeColor + '; border-width: 4px;"></div>')
                } else {
                  console.error('legendData is undefined!');
                }

              } else if (legendJSON.Point) {

                // Legend for point data
                const legendData = legendJSON.Point.graphics[0];
                if (legendData !== undefined) {
                  const divLegend = $("<div/>").attr("id","indexLegend");
                  $("#"+elementID).append(divLegend);

                  const fillColor = legendData.fill;

                  $("#indexLegend").html('');
                  $("#indexLegend").append('<div style="background-color:' + fillColor + '; width: 2vw; height: 2vh;"></div>')
                } else {
                  console.error('legendData is undefined!');
                }

              } else {
                console.warn('Unrecognized geodata. It can\'t possible to print the legend.');
              }


        }
      } catch (e) {
        console.error(e);
      }
    }
    getFeatureProperties();
  };

  var viewResolution = view.getResolution();
  updateLegend(viewResolution);
  // Aggiornamento della legenda al variare della risoluzione (codice disabilitato)
  // map.getView().on('change:resolution', function(event) {
  //   var resolution = event.target.getResolution();
  //   updateLegend(resolution);
  // });

};
