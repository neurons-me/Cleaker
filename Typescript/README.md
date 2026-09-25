<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png" />
  <img src="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png" alt="cleaker" width="200" />
</picture>

# cleaker `4.0.0`

**Who am I, here.**

`.me` gives you an identity. `cleaker` gives that identity a place on the network.

```js
import me from 'this.me'
import cleaker from 'cleaker'

const identity = me('suign', 'my-secret') // your identity, offline
const node = cleaker(identity, 'neurons.me') // your place: suign.neurons.me
```

## Two steps

**1. Be someone.** `me('suign', 'my-secret')` creates your identity on your own device. No server, no network. Your secret never leaves the kernel.

**2. Be somewhere.** `cleaker(me, space)` projects that identity into a space. The space is a root like `neurons.me` or `cleaker.me`, and your name inside it is a namespace: `suign.neurons.me`.

Same identity, different spaces, different namespaces:

```
me('suign', 'my-secret')
  ├── cleaker(me, 'neurons.me') → suign.neurons.me
  └── cleaker(me, 'cleaker.me') → suign.cleaker.me
```

## Claim your name

The first time, you claim the namespace. The claim is signed with a key derived from your identity. Nothing secret is sent.

```js
await node.claim({ namespace: 'suign.neurons.me' })
```

From then on, only the holder of that key can write under that name.

## Come back

Next time, you sign in. cleaker signs a fresh proof, the server checks it against the key from your claim, and your memories come back into your kernel.

```js
const session = await node.signIn({ namespace: 'suign.neurons.me' })
session.memoriesCount // memories restored
```

## Install

```
npm install cleaker
```

## Where it fits

```
this.me  → the kernel. Your identity and your data, offline.
cleaker  → the resolver. Where your identity lives on the network.
monad    → the runtime. Serves namespaces over HTTP.
```

*Resolutio ante directionem — nomen ante locum.*
*Resolution before direction. Name before place.*

> **Who are we, here.**
