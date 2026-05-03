# Cleaker
##### Stay local with `me`. Enter the network with `cleaker(me)`.

```ts
me["@"]("suiGn")  // who are you
cleaker(me, "sui-laptop.local:8181") // where you mount; :8181 is endpoint only
```

**Responsibilities**

| `me["@"]("suiGn")`              | sovereign identity — local, private, no network |
| :------------------------------ | ----------------------------------------------- |
| `cleaker(me, "sui-desk.local")` | first public act — manifests `me` in a space    |

**"Who are you, here."**

`here` does not have to be a public domain — it can be your laptop, a local network node, or a private server. A space is literally where you are.

The seed is the whole truth. The space is where that truth is mounted.
The namespace is the contextual branch that becomes addressable.

The port is not part of the namespace. It belongs to the endpoint used to reach a Monad.

```ts
// Form 1 — explicit
me["@"]("suiGn")
cleaker(me, "sui-laptop.local:8181") // namespace: suign.sui-laptop.local

// Form 2 — fqdn in expression 
me["@"]("suiGn.neurons.me") // You can bake the space into the identity itself
cleaker(me) // reads the complete fqdn
```

Same identity, manifested in different spaces:

```ts
const suign = me["@"]("suiGn")
cleaker(suign, "sui-laptop.local:8181") // namespace: suign.sui-laptop.local; endpoint may use :8181
cleaker(suign, "neurons.me")            // namespace: suign.neurons.me
cleaker(suign, "192.168.1.5:8161")      // endpoint projection: http://192.168.1.5:8161/suign
```

Same seed, different contextual branches:

```txt
root .me seed
  ├── space: neurons.me      → namespace: suign.neurons.me
  ├── space: sui-desk.local  → namespace: suign.sui-desk.local
  └── space: 192.168.1.5     → endpoint projection: 192.168.1.5/suign
```

Change the space, change the branch. Change the seed, change the universe.

## Monads

Cleaker mounts a `.me` into a namespace. Monads execute inside that namespace.

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
me://suign.neurons.me[monadluis]/profile
```

All target `suign.neurons.me/profile`. If both Monads are authorized and synchronized, their answers converge.

Cleaker does not place Monads. NetGet resolves where they physically run.

> Two words. Two lines of code. Whole system.
>
> **Who are we, here.**

## Resolving "here"

`cleaker(me, space)` accepts any host — it figures out the rest.

```ts
cleaker(me)                  // → https://cleaker.me (default public hub)
cleaker(me, "neurons.me")    // → https://neurons.me
cleaker(me, "sui-desk")      // → http://sui-desk.local:8161 (LAN, no dot = local)
cleaker(me, "sui-desk:9000") // → http://sui-desk.local:9000 (custom port)
cleaker(me, "192.168.1.5")   // → http://192.168.1.5:8161
```

**The rule:** a bare hostname becomes `.local`; a public domain uses `https`;
an IP address stays an endpoint projection. Ports are transport only.

#### Philosophy

- Minimal lines; powerful effects.
- Identity is both local and networked, depending on context.
- “*Who are you, here*”: The system is about manifesting identity in the current context/space.

## Summary Table

| Input                                  | Endpoint projection                                          | Namespace constant |
| -------------------------------------- | ------------------------------------------------------------ | ------------------ |
| `cleaker(me)`                          | [https://cleaker.me](https://cleaker.me/)                    | cleaker.me         |
| `cleaker(me, "neurons.me")`            | [https://neurons.me](https://neurons.me/)                    | neurons.me         |
| `cleaker(me, "sui-desk")`              | [http://sui-desk.local:8161](http://sui-desk.local:8161/)    | sui-desk.local     |
| `cleaker(me, "sui-desk:9000")`         | [http://sui-desk.local:9000](http://sui-desk.local:9000/)    | sui-desk.local     |
| `cleaker(me, "192.168.1.5")`           | [http://192.168.1.5:8161](http://192.168.1.5:8161/)          | 192.168.1.5        |
| `cleaker(me, "sui-laptop.local:8181")` | [https://sui-laptop.local:8181](https://sui-laptop.local:8181/) | sui-laptop.local   |

### Core API

```typescript
import me from 'this.me' 
import cleaker from 'cleaker'
// Who are you (local sovereign identity) 
const identity = me["@"]("suiGn")
// Here — enter the matrix 
const node = cleaker(identity)// → cleaker.me (default hub)
const node = cleaker(identity, "neurons.me")   // → your node 
const node = cleaker(identity, "sui-desk")     // → LAN
await node.claim({ secret: "..." })
await node.signIn({ secret: "..." })
// Reads
const name = await node.profile.name 
const friends = await node.friends.list
```

Cleaker does not create identity. It mounts truth.
