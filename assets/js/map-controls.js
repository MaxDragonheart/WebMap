// Controls: zoom/pan/scale/coords
(function () {
  function bindZoom(map) {
    document.getElementById("zoom-in")?.addEventListener("click", () => {
      map.getView().animate({ zoom: map.getView().getZoom() + 1, duration: 200 });
    });
    document.getElementById("zoom-out")?.addEventListener("click", () => {
      map.getView().animate({ zoom: map.getView().getZoom() - 1, duration: 200 });
    });
  }

  function bindPanReset(map, cfg) {
    document.getElementById("pan-reset")?.addEventListener("click", () => {
      const c = (cfg?.view?.center || [12.4964, 41.9028]);
      const z = (cfg?.view?.zoom ?? 12);
      map.getView().animate({ center: ol.proj.fromLonLat(c), zoom: z, duration: 250 });
    });
  }

  function bindCoordsAndScale(map) {
    const lonEl = document.getElementById("lon");
    const latEl = document.getElementById("lat");
    const scaleEl = document.getElementById("scale");

    map.on("pointermove", (evt) => {
      const lonlat = ol.proj.toLonLat(evt.coordinate);
      if (lonEl && latEl) {
        lonEl.textContent = lonlat[0].toFixed(5);
        latEl.textContent = lonlat[1].toFixed(5);
      }
    });

    function updateScale() {
      if (!scaleEl) return;
      scaleEl.textContent = "1:" + WebMap.currentScale(map).toLocaleString();
    }
    updateScale();
    map.getView().on("change:resolution", updateScale);
  }

  window.WebMapControls = { bindZoom, bindPanReset, bindCoordsAndScale };
})();
