// The docs index (docs/index.html): the Cleaker card's cover becomes the real QR.me (GUI.QRme), the same component as the
// home page and the Statuses page, for https://cleaker.me, only the QR: no label around it, no flip.
// The shared landing-gui.js draws docs-index cards from static markup (an <svg>/<img> cover only), so this script waits
// for that render and puts QR.me over the Cleaker card's cover. It is NOT mounted inside the cover box: that box's styles
// stretch every <svg> in it to 100% (right for a drawn cover, wrong for QR.me's own svgs: the .me wordmark grew to the full
// width). So the cover's drawing is hidden (it keeps its 140px band) and QR.me sits on a layer of the same size above it.
// Placement matches the other two covers: 13px from the top of the band, 6px from the bottom.
// Theme: its own G.Theme reads the page's stored theme (window.__thisGuiThemeScope keys), and it is re-mounted when that
// stored theme or mode changes, so it follows the theme picker and light / dark like the rest of the page.
// Without JS, or if this fails, the static SVG cover stays.
(function () {
  "use strict";
  var G = window.GUI, React = window.React, RD = window.ReactDOM;
  if (!G || !React || !RD || !G.QRme || !G.Theme || typeof RD.createRoot !== "function") return;
  var h = React.createElement, NS = "cleaker.me", HREF = "/Cleaker/docs/en/Cleaker.html";
  var TOP = 13, BOTTOM = 6, NATURAL = 128; // QR.me xl without a label is 128px square
  var scope = window.__thisGuiThemeScope || {};
  function read(k, d) { try { return (k && localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function themeKey() { return read(scope.themeIdKey, "neurons.me") + "|" + read(scope.themeModeKey, "dark"); }
  var root = null, mounted = "", band = 140;
  function render() {
    var key = themeKey(), parts = key.split("|");
    if (key === mounted && root) return;
    mounted = key;
    var zoom = Math.min(1, (band - TOP - BOTTOM) / NATURAL);
    root.render(h(G.Theme, { key: key, initialThemeId: parts[0], initialMode: parts[1] },
      h("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "center", height: "100%", paddingBottom: BOTTOM + "px", boxSizing: "border-box", lineHeight: 0 } },
        h("div", { style: { zoom: zoom } },
          h(G.QRme, { variant: "xl", value: "https://" + NS, hoverFlip: false, clickFlip: false, "data-gui-node-id": "Docs.Cleaker.QR" })))));
  }
  function attach() {
    var card = document.querySelector('#root a[href$="' + HREF + '"]');
    var cover = card && card.firstElementChild;
    if (!cover || !cover.querySelector("svg")) return false;
    band = cover.getBoundingClientRect().height || band;
    cover.style.visibility = "hidden";
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    var host = document.createElement("div");
    host.setAttribute("data-cleaker-cover-live", "");
    host.style.cssText = "position:absolute;left:0;right:0;top:" + cover.offsetTop + "px;height:" + band + "px;pointer-events:none";
    card.appendChild(host);
    root = RD.createRoot(host); render();
    setInterval(render, 600); // the picker writes the stored theme; a cheap read keeps this QR on the same one
    return true;
  }
  var tries = 0;
  (function wait() { if (attach() || ++tries > 50) return; setTimeout(wait, 100); })();
})();
