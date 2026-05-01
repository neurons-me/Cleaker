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
cleaker(me, space) // Opens the given namespace
// from its memory and returns a ready node.
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

**Who am I here.**

###### [neurons.me](https://neurons.me)
**MIT License.**
###### suiGn
