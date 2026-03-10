import type express from "express";
import path from "path";

export const GUI_PKG_DIST_DIR = process.env.GUI_PKG_DIST_DIR
  ? path.resolve(process.env.GUI_PKG_DIST_DIR)
  : path.resolve(
      "/Users/suign/Desktop/Neuroverse/all.this/this/GUI/npm/dist"
    );

export function wantsHtml(req: express.Request) {
  const accept = String(req.headers.accept || "");
  return accept.includes("text/html");
}

export function htmlShell() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <link rel="icon" href="/gui/favicon.ico" />
    <link rel="stylesheet" href="/gui/this.gui.css" />
    <title>cleaker.me</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      if (!globalThis.process) {
        globalThis.process = { env: { NODE_ENV: 'production' } };
      } else if (!globalThis.process.env) {
        globalThis.process.env = { NODE_ENV: 'production' };
      } else if (!('NODE_ENV' in globalThis.process.env)) {
        globalThis.process.env.NODE_ENV = 'production';
      }
      const React = globalThis.React;
      const ReactDOM = globalThis.ReactDOM;
      if (!React) throw new Error('React global is missing. Failed to load react.production.min.js');
      if (!ReactDOM) throw new Error('ReactDOM global is missing. Failed to load react-dom.production.min.js');
      await import('/gui/this.gui.umd.js');
      const GUI = globalThis.ThisGUI || globalThis.thisGUI || globalThis.GUI || globalThis['this.gui'];
      const boot = await fetch("/__bootstrap").then(r => r.json());
      let spec = null;
      try {
        spec = await fetch(\`/gui/entry?ns=\${encodeURIComponent(boot.namespace)}\`).then(r => r.json());
      } catch (e) {
        spec = null;
      }

      const guiRuntime = (GUI && (GUI.default || GUI.GUI || GUI)) || {};
      console.log("GUI boot", boot);
      console.log("GUI spec", spec);
      console.log("GUI runtime", guiRuntime);
      const el = document.querySelector('#app');
      if (el) {
        const pre = document.createElement('pre');
        pre.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        pre.style.padding = '16px';
        pre.textContent = \`cleaker GUI shell loaded\\nnamespace: \${boot.namespace}\\nhost: \${boot.host}\\n(apiOrigin: \${boot.apiOrigin})\\nGUI global: \${GUI ? 'present' : 'missing'}\`;
        el.innerHTML = '';
        el.appendChild(pre);
      }
    </script>
  </body>
</html>`;
}
