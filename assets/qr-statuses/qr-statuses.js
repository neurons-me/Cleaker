// The Statuses doc page: every status QR.me has, drawn by the real component (GUI.QRme) in the page's current .GUI
// theme, so the colours are the theme's own (they change with the theme picker and light / dark).
// A doc page puts <div data-live="QrStatuses"></div> in its Markdown and loads this script (front matter `scripts`);
// the shared landing-gui.js renders that div through window.LandingLive. Without JS the div stays empty.
// Colours (this.gui, QR.me + qrContrast): idle and confirmed keep the QR's own primary; checking = warning;
// error = error (something answered and refused); off = grey (nothing answers). The dot at the start of the label:
// idle grey, checking warning, confirmed success, error error.
(function () {
  "use strict";
  var G = window.GUI, React = window.React;
  if (!G || !React || !G.QRme) return;
  var h = React.createElement, Box = G.Atoms && G.Atoms.Box;
  var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  var NS = "cleaker.me";
  var ROWS = [
    { status: "idle", line: "", when: "Nothing was checked. The QR only names the namespace." },
    { status: "checking", line: "connecting to cleaker.me…", when: "Loading the npm builds, or pinging the host (loading, checking)." },
    { status: "confirmed", line: "cleaker.me reachable · 73 ms · public, no who", when: "The host answered (reachable). Not signed in: no who." },
    { status: "off", line: "cleaker.me did not answer", when: "Nothing answers at this address (unreachable)." },
    { status: "error", line: "could not run cleaker: …", when: "Something answered and refused, or cleaker could not run (error)." },
  ];
  function surface() { try { return String(location.host || "").toLowerCase(); } catch (e) { return ""; } }
  function QrStatuses(p) {
    var host = surface(), label = host ? NS + " @ " + host : NS;
    return h(Box, { "data-gui-node-id": p["data-gui-node-id"], sx: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "16px", my: 3 } },
      ROWS.map(function (r) {
        return h(Box, { key: r.status, "data-qr-status": r.status, sx: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1, p: 2, pb: 2.5,
            border: 1, borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper", textAlign: "center" } },
          h(Box, { sx: { pt: 1, pb: 0.5 } },
            h(G.QRme, { variant: "xl", diameter: 132, value: "https://" + NS, perimeterLabel: label, perimeterRootLabel: NS,
              status: r.status, statusLabel: r.line || undefined, clickFlip: false, hoverFlip: false, "data-gui-node-id": "Statuses.QR." + r.status })),
          h(Box, { component: "code", sx: { fontFamily: MONO, fontSize: ".85rem", fontWeight: 700, color: "text.primary" } }, r.status),
          r.line ? h(Box, { sx: { fontFamily: MONO, fontSize: ".72rem", color: "text.secondary", lineHeight: 1.45 } }, r.line) : null,
          h(Box, { sx: { fontSize: ".8rem", color: "text.secondary", lineHeight: 1.5 } }, r.when));
      }));
  }
  window.LandingLive = Object.assign(window.LandingLive || {}, { QrStatuses: QrStatuses });
})();
