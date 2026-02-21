import React from 'react';
import { Outlet } from 'react-router-dom';
// IMPORTANT: import GUI components/hooks from `this.gui` so context instances match `GuiProvider`.
import { Layout, Box, useThemeContext, Blockchain } from 'this.gui';

import {
  topBarConfig,
  leftSidebarConfig,
} from '../Layout/bars';

export default function Board() {
  // Namespace/host is just for display in the TopBar title.
  const ns = typeof window !== 'undefined' ? window.location.host : 'cleaker.me';

  // Keep the hook here so if context mismatches we see it immediately.
  // (Should not throw if the app is correctly using a single this.gui instance.)
  useThemeContext();

  return (
    <Layout
      topBarConfig={topBarConfig(ns)}
      leftSidebarConfig={leftSidebarConfig}
      >
      <Box sx={{ p: 2 }}>
        <Box sx={{ mt: 3 }}>
          <Blockchain />
        </Box>
      </Box>
    </Layout>
  );
}
