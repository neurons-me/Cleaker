import { defineConfig } from 'vite';

const outputFiles = {
  es: 'cleaker.es.js',
  cjs: 'cleaker.cjs',
  umd: 'cleaker.umd.js',
};

const outputFormats = ['es', 'cjs', 'umd'];

export default defineConfig({
  build: {
    lib: {
      entry: 'index.ts',
      name: 'Cleaker',
      fileName: (format) => outputFiles[format] || outputFiles.umd,
      formats: outputFormats,
    },
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
});
