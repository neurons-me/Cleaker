---
layout: readme
title: cleaker
---

{% include_relative README.md %}

<!-- Hero: the .me QR, GUI.QRme (registry "QR.me", this.gui 4.2.0): the same component as the namespace landing on
     cleaker.me. It paints from the .GUI theme (neurons.me), light or dark as this page (prefers-color-scheme), and
     re-renders when that changes. Without JS, or if the CDN fails, the README's cleaker icon stays. -->
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js" integrity="sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js" integrity="sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/this.gui@4.2.0/dist/this.gui.umd.js" integrity="sha384-tAyskhiyJweQ9xXPVOSEJ0OQDE+lFsqRJvGRb8LVoqLbdNxYmJEhW21+fxcAYG0d" crossorigin="anonymous"></script>
<script>
(function () {
  var img = document.querySelector('img[alt="cleaker.me"]'), G = window.GUI;
  if (!img || !G || !G.QRme || !G.Theme || !window.React || !window.ReactDOM) return;
  var box = document.createElement("a");
  box.href = "https://cleaker.me"; box.title = "cleaker.me"; box.className = "cleaker-qr";
  box.setAttribute("aria-label", "cleaker.me: the .me QR");
  box.style.cssText = "display:inline-block;line-height:0;text-decoration:none";
  // a page-scoped theme key, so the mode always follows this page; and keep me-theme's page ground and type
  // (.GUI's Theme applies its CSS baseline to <body>)
  window.__thisGuiThemeScope = { scopeId: "cleaker-home", themeModeKey: "cleaker-home.themeMode", themeIdKey: "cleaker-home.themeId", defaultMode: "light" };
  var keep = document.createElement("style");
  keep.textContent = 'html,html body{background:var(--bg)!important;color:var(--fg)!important}html body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"!important;font-size:16px!important;line-height:1.5!important}';
  document.head.appendChild(keep);
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null, root;
  var draw = function () {
    var mode = mq && mq.matches ? "dark" : "light";
    try { localStorage.setItem("cleaker-home.themeMode", mode); localStorage.setItem("cleaker-home.themeId", "neurons.me"); } catch (e) {}
    root.render(React.createElement(G.Theme, { key: mode, initialThemeId: "neurons.me", initialMode: mode },
      React.createElement(G.QRme, { value: "https://cleaker.me", diameter: 180, variant: "md", hoverFlip: false, clickFlip: false, defaultFace: "qr" })));
  };
  try {
    img.replaceWith(box); root = ReactDOM.createRoot(box); draw();
    if (mq && mq.addEventListener) mq.addEventListener("change", draw);
  } catch (e) { box.replaceWith(img); console.error(e); }
})();
</script>
