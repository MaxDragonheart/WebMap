// Basemap picker dentro la mappa (alto-dx)
(function () {
  function buildMenu(basemapGroup) {
    var menu = document.getElementById("basemap-menu");
    if (!menu) return;
    menu.innerHTML = "";

    var layers = basemapGroup.getLayers().getArray();
    layers.forEach(function (layer, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = layer.get("title") || ("Basemap " + (idx + 1));
      btn.addEventListener("click", function () {
        layers.forEach(function (l) { l.setVisible(false); });
        layer.setVisible(true);
        hideMenu();
      });
      menu.appendChild(btn);
    });
  }

  function hideMenu() {
    var menu = document.getElementById("basemap-menu");
    var toggle = document.getElementById("basemap-toggle");
    if (!menu || !toggle) return;
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  }

  function initPicker(basemapGroup) {
    buildMenu(basemapGroup);

    var toggle = document.getElementById("basemap-toggle");
    var menu = document.getElementById("basemap-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) hideMenu();
      else {
        menu.classList.remove("hidden");
        toggle.setAttribute("aria-expanded", "true");
        menu.setAttribute("aria-hidden", "false");
      }
    });

    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && e.target !== toggle) hideMenu();
    });
  }

  window.WebMapBasemaps = { initPicker: initPicker };
})();
