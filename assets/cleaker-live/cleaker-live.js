// cleaker(me, "cleaker.me") for real, on the Cleaker landing. Same loading rule as the .me site's me-kernel.js: the
// unmodified npm builds (jsDelivr, unpkg fallback), sha256 checked in this browser before import. Neither build imports
// another package by name, so each one is imported from a blob URL of the exact bytes that were checked.
//
// What it does: an anonymous .me (no who) bound to the namespace cleaker.me. A namespace exists without a who, so the
// node resolves cleaker.me's root and can only look: validateHosts() pings GET <host>/__bootstrap. No sign-in, no claim,
// no write (those need a .me that can prove()).
//
// Transport: the page declares https://cleaker.me and talks to nothing else. cleaker's discovery also lists the page's own
// origin and http://localhost (the visitor's local monad) as candidate hosts; the fetcher below refuses every origin but
// the declared one, so a public page never probes a visitor's localhost. Refused candidates are dropped from the summary.
//
// `{ namespace }` is passed explicitly: cleaker 4.0.0 (npm) does not yet resolve the namespace from `space` for an
// anonymous .me (fixed on main, d2ef2dc, unpublished). Both forms give the same node.
//
// window.CleakerLive.connect() → Promise<summary>; state: idle | loading | checking | reachable | unreachable | error;
// subscribe(fn) → unsubscribe.
(function () {
  "use strict";
  if (window.CleakerLive) return;
  var NAMESPACE = "cleaker.me", ORIGIN = "https://cleaker.me";
  var PKGS = {
    me: { label: "this.me@4.2.1", sha256: "0bd2cc60d15dfc9ff8942d390c075bbc22b4ae3a24d3cbfe581511ea84478757",
      urls: ["https://cdn.jsdelivr.net/npm/this.me@4.2.1/dist/me.es.js", "https://unpkg.com/this.me@4.2.1/dist/me.es.js"] },
    cleaker: { label: "cleaker@4.0.0", sha256: "ebbd136af2e9ac03afba76a5375892ee8b9c4f1374a23054a6c51e45860e2a26",
      urls: ["https://cdn.jsdelivr.net/npm/cleaker@4.0.0/dist/cleaker.es.js", "https://unpkg.com/cleaker@4.0.0/dist/cleaker.es.js"] },
  };
  var state = { state: "idle" }, subs = new Set(), promise = null;
  function set(s) { state = s; subs.forEach(function (f) { try { f(state); } catch (e) {} }); }
  function sha256Hex(buf) { return crypto.subtle.digest("SHA-256", buf).then(function (d) { return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }); }
  function loadVerified(pkg) {
    var errors = [], i = 0;
    function next() {
      if (i >= pkg.urls.length) return Promise.reject(new Error("could not load " + pkg.label + ": " + errors.join(" | ")));
      var url = pkg.urls[i++], text;
      return fetch(url, { cache: "force-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then(function (t) { text = t; return sha256Hex(new TextEncoder().encode(t)); })
        .then(function (hash) {
          if (hash !== pkg.sha256) throw new Error("sha256 mismatch: got " + hash);
          var blob = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
          return import(blob).then(function (mod) { URL.revokeObjectURL(blob); return mod; });
        })
        .catch(function (e) { errors.push(url + ": " + (e && e.message || e)); return next(); });
    }
    return next();
  }
  // Only the declared transport leaves the page; any other candidate host fails locally, before a request exists.
  function declaredOnly(input, init) {
    var url = String(input && input.url || input);
    if (url.indexOf(ORIGIN + "/") !== 0) return Promise.reject(new Error("NOT_DECLARED"));
    return fetch(input, init);
  }
  function connect() {
    if (promise) return promise;
    set({ state: "loading" });
    promise = Promise.all([loadVerified(PKGS.me), loadVerified(PKGS.cleaker)]).then(function (mods) {
      var ME = mods[0].default || mods[0].ME, cleaker = mods[1].default || mods[1].cleaker;
      var me = new ME();                                                       // no who
      var node = cleaker(me, NAMESPACE, { namespace: NAMESPACE, fetcher: declaredOnly });
      set({ state: "checking", namespace: NAMESPACE });
      return node.validateHosts({ timeoutMs: 8000 }).then(function (s) {
        var host = (s.hosts || []).filter(function (x) { return x.space === ORIGIN; })[0] || null;
        var summary = {
          state: host && host.status.transport === "up" ? "reachable" : "unreachable",
          namespace: s.activeNamespace, origin: ORIGIN, latencyMs: host ? host.status.latencyMs : null,
          who: null, expression: 'cleaker(me, "' + NAMESPACE + '")', packages: [PKGS.me.label, PKGS.cleaker.label],
        };
        set(summary);
        return summary;
      });
    }).catch(function (e) {
      var s = { state: "error", namespace: NAMESPACE, origin: ORIGIN, text: String(e && e.message || e) };
      set(s);
      return s;
    });
    return promise;
  }
  window.CleakerLive = { NAMESPACE: NAMESPACE, ORIGIN: ORIGIN, PKGS: PKGS, connect: connect,
    get state() { return state; }, subscribe: function (f) { subs.add(f); return function () { subs.delete(f); }; } };
})();
