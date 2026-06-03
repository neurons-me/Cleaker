## Cleaker
For **Rust** developers. Coming Soon.

Currently only available in node.js.

**Please visit:**
https://neurons-me.github.io/Cleaker
https://neurons.me
https://cleaker.me

## What is neurons.me?

**[neurons.me](https://neurons.me)** is a sovereign semantic compute stack. It lets any person or machine own a cryptographic identity, bind it to a namespace, run it as an HTTP daemon, and render it as a user interface — without depending on any central service.

| Layer | Package | Role |
|---|---|---|
| **Kernel** | [`this.me`](https://neurons-me.github.io/.me/) | Schema-free reactive memory. Derives identity from a seed. |
| **Identity** | [`cleaker`](https://neurons-me.github.io/Cleaker/) | Namespace resolver. Projects `.me` into a surface. *Who am I, here.* |
| **Runtime** | [`monad`](https://neurons-me.github.io/monad/) | HTTP daemon. Exposes a namespace over HTTP. Runs the mesh. |
| **Gateway** | [`netget`](https://neurons-me.github.io/netget/) | Routes incoming requests to the correct monad. |
| **Interface** | [`this.gui`](https://neurons-me.github.io/GUI/) | React component library. Renders the semantic surface. |

## This package: `cleaker`

`cleaker` is the **namespace resolver** of the neurons.me stack. It takes a `.me` kernel and a surface address, and answers the question: *"Where does this identity live in the network?"*

Without `cleaker`, a `.me` kernel is sovereign but isolated. `cleaker` projects it into a namespace — a human-readable address like `suign.cleaker.me` or `jabellae.neurons.me` — and connects it to a live monad surface over the network.

```ts
import ME from 'this.me'
import cleaker from 'cleaker'

const me = ME('suign', 'secret')         // sovereign identity — offline, deterministic
const node = cleaker(me, 'cleaker.me')   // project into namespace surface

await node.waitUntilReady()
// node is now bound to suign.cleaker.me — memories hydrated, surface verified
```

**Depends on:** `this.me` (the kernel it resolves).
**Consumed by:** `monad` (uses cleaker to register and route namespace claims), `this.gui` (uses cleaker sessions for identity-aware UI).

---