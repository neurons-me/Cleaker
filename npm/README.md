# Cleaker
##### Stay local with `me`. Enter the network with `cleaker(me)`.

```ts
me["@"]("suiGn")  // who are you
cleaker(me, "sui-laptop.local:8181") // where you are
```

**Responsibilities**

| `me["@"]("suiGn")`              | sovereign identity — local, private, no network |
| :------------------------------ | ----------------------------------------------- |
| `cleaker(me, "sui-desk.local")` | first public act — manifests `me` in a space    |

**"Who are you, here."**

`here` does not have to be a public domain — it can be your laptop, a local network node, or a private server. A space is literally where you are.

```ts
// Form 1 — explicit
me["@"]("suiGn")
cleaker(me, "sui-laptop.local:8181")

// Form 2 — fqdn in expression 
me["@"]("suiGn.neurons.me") // You can bake the space into the identity itself
cleaker(me) // reads the complete fqdn
```

Same identity, manifested in different spaces:

```ts
const suign = me["@"]("suiGn")
cleaker(suign, "sui-laptop.local:8181") // → suign.sui-laptop.local:8181
cleaker(suign, "neurons.me")            // → suign.neurons.me
cleaker(suign, "192.168.1.5:8161")      // → 192.168.1.5:8161/suign
```

> Two words. Two lines of code. Whole system.
>
> **Who are you, here.**

## Resolving "here"

`cleaker(me, space)` accepts any host — it figures out the rest.

```ts
cleaker(me)                  // → https://cleaker.me (default public hub)
cleaker(me, "neurons.me")    // → https://neurons.me
cleaker(me, "sui-desk")      // → http://sui-desk.local:8161 (LAN, no dot = local)
cleaker(me, "sui-desk:9000") // → http://sui-desk.local:9000 (custom port)
cleaker(me, "192.168.1.5")   // → http://192.168.1.5:8161
```

**The rule:** if `space` contains a dot, it's a public domain (`https`).
No dot — local hostname — `.local` and port `8161` added automatically.

#### Philosophy

- Minimal lines; powerful effects.
- Identity is both local and networked, depending on context.
- “*Who are you, here*”: The system is about manifesting identity in the current context/space.

