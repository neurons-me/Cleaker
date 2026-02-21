//Layout/bars.jsx
import { Icon, ThemeModeToggle } from 'this.gui';
// Temporary fallback: if this.gui isn't resolvable during local linking, you can swap to a relative import.
// import ThemeModeToggle from '../../../../all.this/this/GUI/npm/src/gui/components/molecules/Theme/ThemeModeToggle/ThemeModeToggle';

/**
 * TopBar config factory
 *
 * Note: elementsRight uses ReactNode entries (action elements), which are not JSON-serializable.
 * This is fine for the current React-powered Cleaker UI.
 */
export const topBarConfig = (namespace) => ({
  title: namespace,
  // Keep logo URL for brand fallback elsewhere, but we will render a clickable logo action on the right.
  logo: 'https://res.cloudinary.com/dkwnxf6gm/image/upload/v1765054949/cleaker.me_gusn1q.png',
  elementsRight: [
    {
      type: 'action',
      props: {
        element: <ThemeModeToggle variant="minimal" show="icons" iconSize="small" />,
      },
    },
  ],
});


export const leftSidebarConfig = {
  elements: [
    {
      type: 'action',
      props: {
        element: "<div style={{ padding: '16px', textAlign: 'center' }}>",
      },
    },
    { type: 'link', props: { label: 'Dashboard', icon: 'dashboard', to: '/' } },
    {
      type: 'menu',
      props: {
        label: 'Identity',
        icon: 'fingerprint',
        items: [
          { label: 'Profile', icon: 'person', to: '/identity/profile' },
          { label: 'Keys', icon: 'key', to: '/identity/keys' },
        ],
      },
    },
  ],
};

export const rightSidebarConfig = {
  elements: [
    { type: 'link', props: { label: '.audio', icon: 'music_note', href: '/this.audio', external: false } },
    { type: 'link', props: { label: '.image', icon: 'image', href: '/this.image', external: false } },
    { type: 'link', props: { label: '.video', icon: 'videocam', href: '/this.video', external: false } },
    { type: 'link', props: { label: '.link', icon: 'link', href: '/this.link', external: false } },
    { type: 'link', props: { label: '.text', icon: 'text_snippet', href: '/this.text', external: false } },
    { type: 'link', props: { label: '.folder', icon: 'folder', href: '/this.folder', external: false } },
  ],
};

export const footerConfig = {
  brandLabel: '',
  brandLogo: 'https://res.cloudinary.com/dkwnxf6gm/image/upload/v1760629064/neurons.me_b50f6a.png',
  rightElements: [
    {
      type: 'link',
      props: {
        icon: 'forum',
        href: 'https://community.neuroverse.ai',
        external: true,
        iconColor: 'var(--gui-success)',
      },
    },
    {
      type: 'link',
      props: {
        icon: 'menu_book',
        href: '/docs',
        iconColor: 'var(--gui-primary)',
      },
    },
  ],
  position: 'fixed',
};
