import { defineConfig } from 'vitepress';

const base = process.env.VITEPRESS_BASE || '/cleaker/npm/typedocs/';

export default defineConfig({
  title: 'cleaker',
  description: 'Contextual namespace binding for the neurons.me stack. Resolution before direction; name before place.',
  base,
  outDir: '../typedocs',
  appearance: 'force-dark',
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
      { text: 'API', link: 'https://neurons-me.github.io/Cleaker/Typescript/docs/api/' },
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
          { text: 'Overview', link: 'https://neurons-me.github.io/Cleaker/Typescript/docs/api/' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/neurons-me/cleaker' },
    ],
  },
});
