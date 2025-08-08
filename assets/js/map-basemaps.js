// Basemap picker: menu a scomparsa e switch dei layer
(function () {
  function buildMenu(basemapGroup) {
    const menu = document.getElementById("basemap-menu");
    if (!menu) return;

    // Pulisco e ricreo
    menu.innerHTML = "";
    basemapGroup.getLayers().forEach((layer, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = layer.get("title") || `Basemap ${idx+1}`;
      btn.addEventListener("click", () => {
        basemapGroup.getLayers().forEach(l => l.setVisible(false));
        layer.setVisible(true);
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

    // chiudi cliccando fuori
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== toggle) hideMenu();
    });
  }

  window.WebMapBasemaps = { initPicker };
})();
