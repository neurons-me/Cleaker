<img src="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png" alt="cleaker.me" style="height: 203px; width: auto; max-width: 203px;">

# cleaker
> *Resolution before direction. Name before place.*

**Identity exists in relation to something else.**
There is no meaningful [`.me`](https://neurons-me.github.io/.me/) floating in the void. There is only **`.me in context`.**

```typescript
me(SEED);
cleaker(me); // mounts this .me
```

`subject = cleaker(me)` 

# Quick Start

Select your language:

| Language    | Source                          | Status            | Documentation                                                |
| ----------- | ------------------------------- | ----------------- | ------------------------------------------------------------ |
| **Typescript** | `cd cleaker/Typescript && npm install` | [![npm](https://img.shields.io/npm/v/cleaker/latest?label=latest)](https://www.npmjs.com/package/cleaker) | [Typescript Docs ⟡](https://neurons-me.github.io/Cleaker/Typescript/docs/) |
| **Python**  | `cd cleaker/Python/`               | Not Available     | [Python Docs](https://neurons-me.github.io/Cleaker/Python/) |
| **Rust**    | `cd cleaker/Rust/`                 | Not Available     | [Rust Docs](https://neurons-me.github.io/Cleaker/Rust/)     |

```typescript
import cleaker from 'cleaker';
import ME from 'this.me';
const me = new ME();
me.profile.name('Ana');
// Mount into context
let ana = cleaker(me);
console.log(ana.profile.name); // 'Ana'
```

```typescript
me["@"]("suiGn");
cleaker(me, "neurons.me"); // suign.neurons.me
cleaker(me, "sui-desk"); // suign.sui-desk.local
```

### Remote Pointers

```typescript
const ptr = cleaker("me://ana.cleaker.me:read/profile");
ptr.status; // 'unresolved' or 'pending'
await ptr.promise; // resolves remotely and teaches the local kernel
```

---

> Change the space, change the branch. Change the seed, change the universe.

Once a [**namespace**](https://neurons-me.github.io/.me/Typescript/typedocs/Namespace-Resolution-Protocol.html) exists, serve or execute it:

```txt
suign.neurons.me/profile                 semantic path / meaning
suign.neurons.me/photos/iphone           semantic path / meaning
suign.neurons.me/.mesh/monads            internal Monad registry
suign.neurons.me[monadlisa]/profile      technical execution override
```

The normal address has no [monad](https://neurons-me.github.io/monad/) selector:

```txt
me://suign.neurons.me/profile
```

A [monad](https://neurons-me.github.io/monad/) selector is only for diagnostics, replay, or advanced routing:

```txt
me://suign.neurons.me[monadlisa]/profile
me://suign.neurons.me[worker-a]/profile
```

All target `suign.neurons.me/profile`. The selector only changes execution, not meaning.

[Netget](https://neurons-me.github.io/netget/) decides where a [monad](https://neurons-me.github.io/monad/) physically **runs on a laptop, iPhone, Raspberry Pi, VM, relay, or localhost.** 

**Cleaker** keeps the semantic mount clean.

## Core Forms

**Cleaker** is the namespace resolution and context-mounting layer.

It answers the question:   **“Who am I here, and in relation to what?”**

```ts
cleaker() // Fixes the current namespace context.
cleaker(me) // Takes a .me that already carries its own expression
// and mounts it into the current namespace tree.
// No username needed separately — .me already knows its own expression.
```

These are the two primary, conceptual forms.

`cleaker()` fixes context, and `cleaker(me)` places identity into that context.

There is also a practical operational form used by the current implementation:

```typescript
cleaker(me, space) // Mounts name + space as a namespace branch.
// The mounted node can signIn to hydrate from its remote memory.
```

------



<img src="https://suign.github.io/assets/imgs/neurons_me_logo.png" alt="neurons.me logo" width="89">

**Cleaker** does **not** mutate [**.me**](https://neurons-me.github.io/.me/) internals.

It operates as a contextual lens over [the kernel.](https://neurons-me.github.io/.me/Typescript/typedocs/kernel/Core.html)

[The kernel](https://neurons-me.github.io/.me/Typescript/typedocs/kernel/Core.html) learns. **Cleaker** does not reach inside.

**Cleaker** does not create identity. 

It mounts it:

**Who am I here.**

###### [neurons.me](https://neurons.me)
**MIT License.**

###### suiGn
