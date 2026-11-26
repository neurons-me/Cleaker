// The Statuses doc page: every status QR.me has, drawn by the real component (GUI.QRme) in the page's current .GUI
// theme, so the colours are the theme's own (they change with the theme picker and light / dark).
// A doc page puts <div data-live="QrStatuses"></div> in its Markdown and loads this script (front matter `scripts`);
// the shared landing-gui.js renders that div through window.LandingLive. Without JS the div stays empty.
// One even row of five (idle → checking → confirmed → off → error); below 640px the row scrolls sideways instead of
// wrapping, so it never breaks into 3 + 2. Each cell: the QR, the status, the cleaker state it stands for.
// QR.me (this.gui@4.3.0) sizes itself so every module is >= 4px (about 163px here) and this version has no prop to cap
// it, so each QR is drawn at its own size and scaled with CSS zoom (which also shrinks its layout box). They are
// samples of the colours, not codes meant to be scanned from this page.
// Colours (this.gui, QR.me + qrContrast): idle and confirmed keep the QR's own primary; checking = warning;
// error = error (something answered and refused); off = grey (nothing answers). The dot at the start of the label:
// idle grey, checking warning, confirmed success, error a cross.
(function () {
  "use strict";
  var G = window.GUI, React = window.React;
  if (!G || !React || !G.QRme) return;
  var h = React.createElement, Box = G.Atoms && G.Atoms.Box;
  var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  var NS = "cleaker.me", ZOOM = 0.62;
  var ROWS = [
    { status: "idle", state: "not checked" },
    { status: "checking", state: "loading · checking" },
    { status: "confirmed", state: "reachable" },
    { status: "off", state: "unreachable" },
    { status: "error", state: "error" },
  ];
  function QrStatuses(p) {
    return h(Box, { "data-gui-node-id": p["data-gui-node-id"], sx: { mt: 1, mb: 4, mx: -0.5, overflowX: "auto", pb: 0.5 } },
      h(Box, { sx: { display: "grid", gridTemplateColumns: "repeat(5, minmax(112px, 1fr))", gap: "10px", px: 0.5 } },
        ROWS.map(function (r) {
          return h(Box, { key: r.status, "data-qr-status": r.status, sx: { display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75, pt: 2, pb: 1.75, px: 1,
              border: 1, borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper", textAlign: "center" } },
            h(Box, { sx: { zoom: ZOOM, lineHeight: 0 } },
              h(G.QRme, { variant: "xl", value: "https://" + NS, perimeterLabel: NS, perimeterRootLabel: NS,
                status: r.status, clickFlip: false, hoverFlip: false, "data-gui-node-id": "Statuses.QR." + r.status })),
            h(Box, { component: "code", sx: { mt: 0.75, fontFamily: MONO, fontSize: ".82rem", fontWeight: 700, color: "text.primary" } }, r.status),
            h(Box, { sx: { fontFamily: MONO, fontSize: ".7rem", color: "text.secondary", lineHeight: 1.4 } }, r.state));
        })));
  }
  window.LandingLive = Object.assign(window.LandingLive || {}, { QrStatuses: QrStatuses });
})();
