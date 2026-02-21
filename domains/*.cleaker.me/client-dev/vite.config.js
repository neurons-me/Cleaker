import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // ✅ Explicitly specify the `env/` directory for environment variables
  const env = loadEnv(mode, process.cwd() + '/env');
  // ✅ Ensure `VITE_BASE_DOMAIN` is assigned properly
  process.env.VITE_BASE_DOMAIN = env.VITE_BASE_DOMAIN || 'cleaker.me';
  console.log(`Running in ${mode} mode with BASE_DOMAIN: ${process.env.VITE_BASE_DOMAIN}`);

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'this.gui'],
      preserveSymlinks: false,
    },
    server: {
      https: false,
      host: '0.0.0.0',
      port: env.VITE_PORT || 8384,
      open: false,
      cors: true,
      allowedHosts: [".lvh.me", "localhost"],
      hmr: {
        protocol: 'ws',
        host: process.env.VITE_BASE_DOMAIN,
        port: env.VITE_PORT || 8384,
      },
      proxy: {
        '/ws': {
          target: `ws://${process.env.VITE_BASE_DOMAIN}:${env.VITE_PORT || 3000}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist/',
      sourcemap: true,
    },
  };
});