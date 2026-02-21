// src/Layout/Layout.jsx
import { Outlet } from 'react-router-dom';
// IMPORTANT: all GUI components/hooks must be imported from `this.gui` so context instances match `GuiProvider`.
import { Layout, Box, Typography, useThemeContext } from 'this.gui';
import { topBarConfig, leftSidebarConfig, rightSidebarConfig, footerConfig } from './bars';
export default function AppLayout() {
  // TODO: wire this to cleaker identity/namespace later
  const ns = typeof window !== 'undefined' ? window.location.host : 'cleaker.me';

  // Debug: the app should always be under the *same* GuiProvider instance as this hook.
  // If this throws, you likely have 2 copies of `this.gui` in the bundle (linked + installed),
  // or you're importing from different entrypoints.
  let themeCtx;
  try {
    themeCtx = useThemeContext();
  } catch (e) {
    console.error('[AppLayout] useThemeContext FAILED. Likely duplicate this.gui instance.', e);
    // Render a readable fallback instead of crashing the whole tree.
    return (
      <div style={{ padding: 16, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
        <h3>GuiProvider context mismatch</h3>
        <p>
          <b>Cause:</b> This component is importing hooks/components from a different <code>this.gui</code> instance than the one that rendered <code>&lt;GuiProvider&gt;</code>.
        </p>
        <p>
          <b>Fix (quick checklist):</b>
        </p>
        <ol style={{ lineHeight: 1.6 }}>
          <li>
            In the app, run <code>npm ls this.gui</code> (or <code>pnpm why this.gui</code>) and confirm there is
            exactly <b>one</b> resolved copy.
          </li>
          <li>
            If you are using <code>npm link</code> / workspace symlinks, ensure <code>this.gui</code> declares
            <code>react</code> and <code>react-dom</code> as <b>peerDependencies</b> (not dependencies) and does not
            ship/bundle its own React.
          </li>
          <li>
            In Vite, force singletons via <code>resolve.dedupe</code> for <code>react</code>, <code>react-dom</code>,
            and <code>this.gui</code>. Also consider <code>resolve.preserveSymlinks: false</code> so symlinks resolve
            to the real path.
          </li>
          <li>
            Confirm you import everything consistently from the same entrypoint:{' '}
            <code>{"import { Layout, useThemeContext } from 'this.gui'"}</code>
          </li>
        </ol>
      </div>
    );
  }

  if (typeof window !== 'undefined') {
    // Log only a few times so we don't spam the console.
    window.__APP_LAYOUT_LOGS__ = (window.__APP_LAYOUT_LOGS__ ?? 0) + 1;
    if (window.__APP_LAYOUT_LOGS__ <= 5) {
      console.log('[AppLayout] themeCtx', themeCtx);
    }
  }
  return (
    <Layout
      topBarConfig={topBarConfig(ns)}
      leftSidebarConfig={leftSidebarConfig}
      rightSidebarConfig={rightSidebarConfig}
      footerConfig={footerConfig}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Layout shell
        </Typography>
        <Typography sx={{ opacity: 0.8 }}>
          If you can see the top bar + sidebars + footer, the Layout is receiving configs correctly.
        </Typography>
        <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Layout>
  );
}