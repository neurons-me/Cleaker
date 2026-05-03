<img src="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png" alt="cleaker.me" height="203">

# CLEAKER
> ***Resolutio ante directionem; nomen ante locum.***
> **שם קודם למקום**

**Identity exists in relation to something else**. There is no meaningful `.me` floating in the void.

There is only **`.me in context`.**

```
cleaker()     → fixes the current namespace context 
cleaker(me)   → mounts this .me into that context
```

Not: `identity = user + config`

`subject = cleaker(me)` 

The seed is the whole truth. The space is where that truth is mounted.
The namespace is the contextual branch that becomes addressable.

```txt
root .me seed
  └── space: neurons.me
        └── namespace: suign.neurons.me

root .me seed
  └── space: sui-desk.local
        └── namespace: suign.sui-desk.local
```

Change the space, change the branch. Change the seed, change the universe.

## Monads in a Namespace

Cleaker mounts truth into a namespace. It does not decide where execution happens.

Once a namespace exists, active Monads can serve or execute inside it:

```txt
suign.neurons.me/profile                 semantic path / meaning
suign.neurons.me/photos/iphone           semantic path / meaning
suign.neurons.me/.mesh/monads            internal Monad registry
suign.neurons.me[monadlisa]/profile      technical execution override
```

The normal address has no Monad selector:

```txt
me://suign.neurons.me/profile
```

A Monad selector is only for diagnostics, replay, or advanced routing:

```txt
me://suign.neurons.me[monadlisa]/profile
me://suign.neurons.me[worker-a]/profile
```

All target `suign.neurons.me/profile`. The selector only changes execution, not meaning.

NetGet decides where a Monad physically runs: laptop, iPhone, Raspberry Pi, VM, relay, or localhost. Cleaker keeps the semantic mount clean.

## Core Forms

**Cleaker** is the namespace resolution and context-mounting layer for the Neuroverse ecosystem.

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

# Quick Start
Select your language:
| Language    | Source                          | Status            | Documentation                                                |
| ----------- | ------------------------------- | ----------------- | ------------------------------------------------------------ |
| **Node.js** | `cd cleaker/npm && npm install` | **Stable 3.6.40** | [node.js Docs ⟡ ](https://neurons-me.github.io/.me/npm/typedocs/) |
| **Python**  | `cd cleaker/pip/`               | Not Available     |                                                              |
| **Rust**    | `cd cleaker/crate/`             | Not Available     |                                                              |

```typescript
import cleaker from 'cleaker';
import ME from 'this.me';

const me = new ME();
me.profile.name('Ana');

// Mount into context
const node = cleaker(me);

console.log(node.profile.name); // 'Ana'
```

```typescript
me["@"]("suiGn");

cleaker(me, "neurons.me"); // suign.neurons.me
cleaker(me, "sui-desk");   // suign.sui-desk.local
```

### Remote Pointers

```typescript
const ptr = cleaker("me://ana.cleaker.me:read/profile");

ptr.status;        // 'unresolved' or 'pending'
await ptr.promise; // resolves remotely and teaches the local kernel
```



<img src="https://suign.github.io/assets/imgs/neurons_me_logo.png" alt="neurons.me logo" width="89">

Cleaker does **not** mutate .me internals.

It operates as a contextual lens over the kernel.

The kernel learns. Cleaker does not reach inside.

Cleaker does not create identity. It mounts truth.

**Who am I here.**

###### [neurons.me](https://neurons.me)
**MIT License.**
###### suiGn
