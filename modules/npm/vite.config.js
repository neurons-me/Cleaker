// vite.config.js — cleaker (library build)
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    lib: {
      entry: 'index.js',
      name: 'Cleaker', // UMD global
      fileName: (format) =>
        format === 'es' ? 'cleaker.es.js'
        : format === 'cjs' ? 'cleaker.cjs.js'
        : 'cleaker.umd.js',
      formats: ['es', 'cjs', 'umd'],
    },
    sourcemap: true,
    target: 'es2019',
    rollupOptions: {
      // Do not bundle common deps for ES/CJS consumers
      external: [
        'axios',
        'crypto-js',
        'ethers',
        'js-sha3',
        'jsonwebtoken',
      ],
      output: {
        exports: 'named', // avoid default+named interop warning
        // UMD globals for externals
        globals: {
          axios: 'axios',
          'crypto-js': 'CryptoJS',
          ethers: 'ethers',
          'js-sha3': 'jsSha3',
          jsonwebtoken: 'jsonwebtoken',
        },
      },
    },
  },
});
