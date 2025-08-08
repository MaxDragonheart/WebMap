// Basemap picker: menu a scomparsa e switch dei layer + log
(function () {
  function buildMenu(basemapGroup) {
    const menu = document.getElementById("basemap-menu");
    if (!menu) return;

    menu.innerHTML = "";

    const layers = basemapGroup.getLayers().getArray();
    console.log("Basemap picker building menu with", layers.length, "layers");

    layers.forEach((layer, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = layer.get("title") || `Basemap ${idx + 1}`;
      btn.addEventListener("click", () => {
        layers.forEach(l => l.setVisible(false));
        layer.setVisible(true);
        // dopo lo switch riaffermiamo centro/zoom da config se definito
        if (window.__MAP_CONFIG__?.view?.center || typeof window.__MAP_CONFIG__?.view?.zoom === "number") {
          const center = window.__MAP_CONFIG__.view.center;
          const zoom   = window.__MAP_CONFIG__.view.zoom;
          if (center) {
            const target = ol.proj.fromLonLat([parseFloat(center[0]), parseFloat(center[1])]);
            basemapGroup.getMap().getView().animate({ center: target, duration: 0 });
          }
          if (typeof zoom === "number") {
            basemapGroup.getMap().getView().animate({ zoom: zoom, duration: 0 });
          }
        }
        hideMenu();
      });
      menu.appendChild(btn);
    });
  }

  function hideMenu() {
    const menu = document.getElementById("basemap-menu");
    const toggle = document.getElementById("basemap-toggle");
    if (!menu || !toggle) return;
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  }

  function initPicker(basemapGroup) {
    buildMenu(basemapGroup);

    const toggle = document.getElementById("basemap-toggle");
    const menu = document.getElementById("basemap-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) hideMenu();
      else {
        menu.classList.remove("hidden");
        toggle.setAttribute("aria-expanded", "true");
        menu.setAttribute("aria-hidden", "false");
      }
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== toggle) hideMenu();
    });
  }

  window.WebMapBasemaps = { initPicker };
})();
