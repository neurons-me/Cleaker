// The Algebra of .me (docs/en/The-Algebra-of-Me.md): three axioms run live in the page, on the unmodified npm build of
// this.me@4.2.1 (jsDelivr, unpkg fallback), sha256 checked in this browser before import, as the .me site's me-kernel.js
// does. Nothing here talks to a server: every result is computed in this browser.
//   AxIdentity  (Ax1) type any name, get its identity hash: the same for everyone, so it protects nothing.
//   AxLocation  (Ax4) this page's location next to the namespace: the door changes, the namespace does not.
//   AxAuthority (Ax5) a claim key, a write signed by its owner, and a forgery that carries the same identity hash.
// The doc places them with <div data-live="AxIdentity"></div> (etc.); the shared landing-gui.js renders those divs from
// window.LandingLive. Without JS the divs stay empty and the axioms read as text.
(function () {
  "use strict";
  var G = window.GUI, React = window.React;
  if (!G || !React) return;
  var h = React.createElement, Box = G.Atoms && G.Atoms.Box;
  var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  var PKG = { label: "this.me@4.2.1", sha256: "0bd2cc60d15dfc9ff8942d390c075bbc22b4ae3a24d3cbfe581511ea84478757",
    urls: ["https://cdn.jsdelivr.net/npm/this.me@4.2.1/dist/me.es.js", "https://unpkg.com/this.me@4.2.1/dist/me.es.js"] };
  var kernel = null;
  function sha256Hex(buf) { return crypto.subtle.digest("SHA-256", buf).then(function (d) { return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }); }
  function loadMe() {
    if (kernel) return kernel;
    var errors = [], i = 0;
    function next() {
      if (i >= PKG.urls.length) return Promise.reject(new Error("could not load " + PKG.label + ": " + errors.join(" | ")));
      var url = PKG.urls[i++], text;
      return fetch(url, { cache: "force-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then(function (t) { text = t; return sha256Hex(new TextEncoder().encode(t)); })
        .then(function (hash) {
          if (hash !== PKG.sha256) throw new Error("sha256 mismatch");
          var blob = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
          return import(blob).then(function (m) { URL.revokeObjectURL(blob); return m; });
        })
        .catch(function (e) { errors.push(url + ": " + (e && e.message || e)); return next(); });
    }
    kernel = next();
    return kernel;
  }
  var ID = Symbol.for("me.identity");
  function idOf(M, name) { return new M.ME(name)[ID].hash; }
  function short(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; }

  // ── shared look: a panel, a mono line, a status word ──
  function Panel(p) {
    return h(Box, { "data-gui-node-id": p.id, sx: { my: 2.5, p: 2, border: 1, borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper" } },
      p.children,
      h(Box, { sx: { mt: 1.5, fontSize: ".72rem", color: "text.disabled", fontFamily: MONO } }, "live · " + PKG.label + " (npm, sha256 checked) · computed in this browser, nothing is sent"));
  }
  function Line(p) {
    return h(Box, { sx: { fontFamily: MONO, fontSize: ".82rem", lineHeight: 1.7, color: p.dim ? "text.secondary" : "text.primary", whiteSpace: p.dim ? "normal" : "pre-wrap", wordBreak: "break-all" } }, p.children);
  }
  function Word(p) {
    return h(Box, { component: "span", sx: { fontWeight: 700, color: p.ok ? "success.main" : p.bad ? "error.main" : "text.primary" } }, p.children);
  }
  function Input(p) {
    return h(Box, { component: "input", value: p.value, onChange: function (e) { p.onChange(e.target.value); }, spellCheck: false, "aria-label": p.label,
      sx: { width: "100%", boxSizing: "border-box", px: 1.5, py: 1, mb: 1.5, fontFamily: MONO, fontSize: ".9rem", color: "text.primary", bgcolor: "background.default",
        border: 1, borderColor: "divider", borderRadius: "8px", outline: "none", "&:focus": { borderColor: "primary.main" } } });
  }
  function useKernel() {
    var st = React.useState(null), set = st[1];
    React.useEffect(function () { loadMe().then(function (m) { set({ M: m }); }, function (e) { set({ error: String(e && e.message || e) }); }); }, []);
    return st[0];
  }

  // ── Ax1: one constant ──
  function AxIdentity(p) {
    var k = useKernel(), nameS = React.useState("cleaker.me"), name = nameS[0];
    var hash = "", err = k && k.error;
    if (k && k.M && name.trim()) { try { hash = idOf(k.M, name.trim()); } catch (e) { err = String(e && e.message || e); } }
    return h(Panel, { id: p["data-gui-node-id"] },
      h(Input, { value: name, onChange: nameS[1], label: "A name" }),
      h(Line, null, 'id("', name.trim(), '") = ', h(Word, null, hash ? short(hash, 24) : (err ? "—" : "…"))),
      h(Line, { dim: true }, err ? "could not run: " + err
        : "Anyone who types this name gets this same hash, on any device: it is public, so it can be the axis and can never be a key."));
  }

  // ── Ax4: namespace ≠ location ──
  var DOORS = ["https://cleaker.me/", "http://localhost:8161/", "https://neurons-me.github.io/Cleaker/?ref=1234"];
  function AxLocation(p) {
    var here = location.href, doorS = React.useState(here), door = doorS[0], u;
    try { u = new URL(door); } catch (e) { u = null; }
    var surface = u ? u.host : "", ns = "cleaker.me";
    var doorBtn = function (d) {
      return h(Box, { key: d, component: "button", onClick: function () { doorS[1](d); }, sx: { mr: 1, mb: 1, px: 1.25, py: 0.5, fontFamily: MONO, fontSize: ".75rem", cursor: "pointer",
        color: door === d ? "primary.contrastText" : "text.secondary", bgcolor: door === d ? "primary.main" : "transparent", border: 1, borderColor: door === d ? "primary.main" : "divider", borderRadius: "8px" } },
        d === here ? "this page" : d.replace(/^https?:\/\//, "").replace(/\/$/, ""));
    };
    return h(Panel, { id: p["data-gui-node-id"] },
      h(Box, { sx: { mb: 1 } }, [here].concat(DOORS.filter(function (d) { return d !== here; })).map(doorBtn)),
      h(Line, null, "location   ", u ? u.protocol + "//" + u.host + u.pathname + u.search : "—"),
      h(Line, null, "  port     ", u ? (u.port || "(default)") : "—", "   path ", u ? u.pathname : "—", "   query ", u ? (u.search || "(none)") : "—"),
      h(Line, null, "namespace  ", h(Word, { ok: true }, ns)),
      h(Line, null, "position   ", ns, " @ ", surface),
      h(Line, { dim: true }, "Change the door: the port, the path and the query change, the namespace stays cleaker.me. Where you are is not what you are in."));
  }

  // ── Ax5: authority never comes from the seed ──
  function AxAuthority(p) {
    var k = useKernel(), resS = React.useState(null), res = resS[0], busyS = React.useState(false);
    function run() {
      if (!k || !k.M || busyS[0]) return;
      busyS[1](true);
      var M = k.M, rnd = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      var owner = new M.ME("ana", rnd), guess = new M.ME("ana", "a-guess");
      var ns = { rootNamespace: "cleaker.me" }, act = { rootNamespace: "cleaker.me", challenge: "write profile.name" };
      Promise.all([owner["!"].prove(ns), owner["!"].prove(act), guess["!"].prove(act)]).then(function (r) {
        var claim = r[0], write = r[1], forged = r[2];
        var forgedMsg = forged.message.split(forged.identityHash).join(claim.identityHash);
        return Promise.all([M.verifyEd25519Signature(claim.publicKey, write.message, write.signature),
          M.verifyEd25519Signature(claim.publicKey, forgedMsg, forged.signature)]).then(function (v) {
          resS[1]({ claim: claim, forged: forged, ownerOk: v[0], forgedOk: v[1] });
        });
      }).catch(function (e) { resS[1]({ error: String(e && e.message || e) }); }).then(function () { busyS[1](false); });
    }
    var btn = h(Box, { component: "button", onClick: run, disabled: !k || !k.M || busyS[0], sx: { mb: 1.5, px: 1.5, py: 0.75, fontWeight: 700, fontSize: ".82rem", cursor: "pointer",
      color: "primary.contrastText", bgcolor: "primary.main", border: 0, borderRadius: "8px", "&:disabled": { opacity: .5, cursor: "default" } } },
      res ? "▶ Run again" : "▶ Run");
    var body = !res ? h(Line, { dim: true }, k && k.error ? "could not run: " + k.error : "Registers a claim key for ana.cleaker.me, then checks two writes against it.")
      : res.error ? h(Line, { dim: true }, "could not run: " + res.error)
      : [
        h(Line, { key: "c" }, "claim(ana.cleaker.me)  key ", short(res.claim.publicKey, 18), "   id ", short(res.claim.identityHash, 14)),
        h(Line, { key: "o" }, "write signed by ana     → ", h(Word, { ok: res.ownerOk, bad: !res.ownerOk }, res.ownerOk ? "accepted" : "refused")),
        h(Line, { key: "f" }, "write carrying ana's id, signed by another key → ", h(Word, { ok: res.forgedOk, bad: !res.forgedOk }, res.forgedOk ? "accepted" : "refused")),
        h(Line, { key: "d", dim: true }, "The forgery copies the public identity hash; what it cannot copy is the key anchored in the claim. The hash is a label, never authority."),
      ];
    return h(Panel, { id: p["data-gui-node-id"] }, btn, body);
  }

  window.LandingLive = Object.assign(window.LandingLive || {}, { AxIdentity: AxIdentity, AxLocation: AxLocation, AxAuthority: AxAuthority });
})();
