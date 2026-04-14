window.spec = {
  type: "Page",
  props: {
    title: "Cleaker",
    subtitle: "CDN bootstrap for this.GUI + this.me",
  },
  children: [
    {
      type: "Paper",
      props: {
        sx: {
          p: 2,
          mt: 2,
          borderRadius: 2,
        },
      },
      children: [
        {
          type: "Typography",
          props: {
            variant: "body1",
            sx: { fontWeight: 800 },
          },
          children: ["GUI ready"],
        },
        {
          type: "Typography",
          props: {
            variant: "body2",
            sx: { mt: 1, opacity: 0.8 },
          },
          children: ["window.Me initialized from CDN UMD"],
        },
      ],
    },
  ],
};
