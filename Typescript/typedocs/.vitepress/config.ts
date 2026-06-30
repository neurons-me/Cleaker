import { defineConfig } from 'vitepress';

const base = process.env.VITEPRESS_BASE || '/Cleaker/Typescript/typedocs/';

export default defineConfig({
  title: 'cleaker',
  description: 'Contextual namespace binding for the neurons.me stack. Resolution before direction; name before place.',
  base,
  outDir: '.',
  appearance: 'force-dark',
  // Source .md files and built .html output live side by side in this folder.
  // Never let VitePress empty outDir — that would delete the .md source on every build.
  vite: { build: { emptyOutDir: false } },
  head: [
    ['meta', { name: 'author', content: 'neurons.me' }],
    ['meta', { name: 'keywords', content: 'cleaker, namespace, me://, contextual binding, semantic mounting, monad.ai, neurons.me' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'cleaker — Documentation' }],
    ['meta', { property: 'og:description', content: 'Contextual namespace binding. Resolution before direction; name before place.' }],
    ['meta', { property: 'og:url', content: 'https://neurons-me.github.io/cleaker/npm/typedocs/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'cleaker — Documentation' }],
    ['meta', { name: 'twitter:description', content: 'Contextual namespace binding. Resolution before direction; name before place.' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'The Model', link: '/The-Model' },
      { text: 'Algebra', link: '/Algebra-of-Me' },
      { text: 'API', link: 'https://neurons-me.github.io/Cleaker/Typescript/typedocs/api/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'The Model', link: '/The-Model' },
          { text: 'Cleaker Protocol', link: '/Cleaker' },
        ],
      },
      {
        text: 'Concepts',
        items: [
          { text: 'Algebra of Me', link: '/Algebra-of-Me' },
          { text: 'The Flat Universe', link: '/The-Flat-Universe' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: 'https://neurons-me.github.io/Cleaker/Typescript/typedocs/api/' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/neurons-me/cleaker' },
    ],
  },
});
