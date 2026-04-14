window.registerRoutes = function registerRoutes(router) {
  router.get("/", {
    type: "Page",
    props: {
      title: "Hello World",
      subtitle: "Edit routes.js to define the routes of your app.",
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
            children: ["Your app now lives in routes.js."],
          },
          {
            type: "Typography",
            props: {
              variant: "body2",
              sx: { mt: 1, opacity: 0.8 },
            },
            children: [
              "Add more routes like: router.get('/about', aboutSpec);",
            ],
          },
        ],
      },
    ],
  });
};
