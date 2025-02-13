const isBrowser = typeof window !== "undefined";
const cleaker = isBrowser
  ? await import("./src/cleaker.browser.js").then(m => m.default)
  : await import("./src/cleaker.node.js").then(m => m.default);
export default cleaker;