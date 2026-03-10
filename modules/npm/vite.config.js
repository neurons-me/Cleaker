import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'index.ts',
      name: 'Cleaker',
      fileName: (format) =>
        format === 'es' ? 'cleaker.es.js'
        : format === 'cjs' ? 'cleaker.cjs'
        : 'cleaker.umd.js',
      formats: ['es', 'cjs', 'umd'],
    },
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
});
