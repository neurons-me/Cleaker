// The docs index (docs/index.html): the Cleaker card's cover becomes the real QR.me (GUI.QRme), the same component as the
// home page and the Statuses page, for https://cleaker.me, set as the home sets it: label "cleaker.me @ <host>", no flip.
// The shared landing-gui.js draws docs-index cards from static markup (an <svg>/<img> cover only), so this script waits
// for that render and mounts QR.me into the Cleaker card's cover box. The static SVG stays as the no-JS fallback.
// Theme: its own G.Theme reads the page's stored theme (window.__thisGuiThemeScope keys), and it is re-mounted when that
// stored theme or mode changes, so it follows the theme picker and light / dark like the rest of the page.
(function () {
  "use strict";
  var G = window.GUI, React = window.React, RD = window.ReactDOM;
  if (!G || !React || !RD || !G.QRme || !G.Theme || typeof RD.createRoot !== "function") return;
  var h = React.createElement, NS = "cleaker.me", HREF = "/Cleaker/docs/en/Cleaker.html", ZOOM = 0.72;
  var scope = window.__thisGuiThemeScope || {};
  function read(k, d) { try { return (k && localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function themeKey() { return read(scope.themeIdKey, "neurons.me") + "|" + read(scope.themeModeKey, "dark"); }
  var root = null, mounted = "", host = null;
  // as the home writes it: namespace @ surface (the host this page is served from)
  function label() { var h_ = String(location.host || "").toLowerCase(); return h_ ? NS + " @ " + h_ : NS; }
  function render() {
    var key = themeKey(), parts = key.split("|");
    if (key === mounted && root) return;
    mounted = key;
    root.render(h(G.Theme, { key: key, initialThemeId: parts[0], initialMode: parts[1] },
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", lineHeight: 0 } },
        h("div", { style: { zoom: ZOOM } },
          h(G.QRme, { variant: "xl", value: "https://" + NS, perimeterLabel: label(), perimeterRootLabel: NS,
            hoverFlip: false, clickFlip: false, "data-gui-node-id": "Docs.Cleaker.QR" })))));
  }
  function attach() {
    var card = document.querySelector('#root a[href$="' + HREF + '"]');
    var cover = card && card.firstElementChild;
    if (!cover || !cover.querySelector("svg")) return false;
    host = document.createElement("div");
    host.style.cssText = "height:100%;width:100%";
    cover.innerHTML = ""; cover.appendChild(host);
    root = RD.createRoot(host); render();
    setInterval(render, 600); // the picker writes the stored theme; a cheap read keeps this QR on the same one
    return true;
  }
  var tries = 0;
  (function wait() { if (attach() || ++tries > 50) return; setTimeout(wait, 100); })();
})();
