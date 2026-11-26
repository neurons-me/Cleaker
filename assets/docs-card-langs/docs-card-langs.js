// The docs index (docs/index.html): language pills on a card, as the neurons-me.github.io index puts "ES / JA" in the
// top corner of a card. The shared landing-gui.js draws docs-index cards from static markup and has no slot for them,
// so this script adds them once the cards are rendered. The list lives in the page as data:
//   <script type="application/json" id="card-langs">{ "<card href ends with>": [["ES", "<url>"], ...] }</script>
// A pill is not an <a> inside the card's <a> (links cannot nest): it is a role="link" span that opens its URL on click
// or Enter and stops the card's own link from firing. Colours are the .GUI theme variables.
(function () {
  "use strict";
  var data = {};
  try { data = JSON.parse((document.getElementById("card-langs") || {}).textContent || "{}"); } catch (e) { return; }
  var keys = Object.keys(data);
  if (!keys.length) return;
  function pill(label, url) {
    var s = document.createElement("span");
    s.textContent = label; s.setAttribute("role", "link"); s.setAttribute("tabindex", "0");
    s.setAttribute("title", url); s.setAttribute("data-card-lang", label);
    s.style.cssText = "font-weight:700;font-size:.7rem;line-height:1.5;letter-spacing:.04em;padding:2px 8px;border-radius:999px;cursor:pointer;" +
      "color:var(--mui-palette-primary-main,#0f6a78);" +
      "background:color-mix(in srgb,var(--mui-palette-primary-main,#0f6a78) 16%,var(--mui-palette-background-paper,#111a1f))";
    function go(e) { e.preventDefault(); e.stopPropagation(); location.href = url; }
    s.addEventListener("click", go);
    s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") go(e); });
    return s;
  }
  function attach() {
    var done = 0;
    keys.forEach(function (suffix) {
      var card = document.querySelector('#root a[href$="' + suffix + '"]');
      if (!card) return;
      done++;
      if (card.querySelector("[data-card-langs]")) return;
      if (getComputedStyle(card).position === "static") card.style.position = "relative";
      var box = document.createElement("div");
      box.setAttribute("data-card-langs", "");
      box.style.cssText = "position:absolute;top:12px;right:12px;display:flex;gap:6px;z-index:2";
      data[suffix].forEach(function (l) { box.appendChild(pill(l[0], l[1])); });
      card.appendChild(box);
    });
    return done === keys.length;
  }
  var tries = 0;
  (function wait() { if (attach() || ++tries > 50) return; setTimeout(wait, 100); })();
})();
