# Cleaker — Namespace Grammar for NRP

Cleaker is the **namespace grammar layer**. It sits between raw strings and the NRP resolver.

When Beatle receives input like `jabellae` or `cleaker.me[host:localhost|protocol:http|port:8161]:open/profile`, Cleaker parses each leaf into a structured `ParsedNamespaceExpression` before the NRP expression is sent over the wire.

---

## What Cleaker Parses

```txt
jabellae
jabellae.suis-macbook-air.local
cleaker.me[host:localhost|protocol:http|port:8161]:open/profile
me://jabellae.cleaker.me/photos/iphone
```

All of these are valid Cleaker namespace expressions. The parser returns:

```ts
{
  raw,            // original input
  expression,     // canonical stringified form
  base,           // base namespace token
  fqdn,           // fully-qualified domain name
  prefix,         // namespace prefix
  constant,       // leaf constant
  labels,         // parsed label map
  contextRaw,     // raw [...] context string
  context,        // parsed context key/value pairs
  operation,      // :operation suffix
  path,           // /path suffix
  transport       // resolved transport hints
}
```

---

## Grammar

```txt
namespace = base [ '[' context ']' ]? [ ':' operation ]? [ '/' path ]?
base      = label ('.' label)*
label     = alphanum | hyphen | underscore
context   = kv ('|' kv)*
kv        = key ':' value
```

Examples:

```txt
jabellae
  → base: jabellae, fqdn: jabellae

jabellae.suis-macbook-air.local
  → prefix: jabellae, constant: local, fqdn: jabellae.suis-macbook-air.local

cleaker.me[host:localhost|protocol:http|port:8161]:open/profile
  → base: cleaker.me
  → context: { host: localhost, protocol: http, port: 8161 }
  → operation: open
  → path: profile
```

---

## Role in NRP Expression Parsing

The NRP algebra parser (`NRPExpression.ts`) treats each namespace leaf as a Cleaker token:

```txt
NRP algebra:    a + b ∩ c @ surface
                ↑   ↑   ↑
                └───┴───┴── each leaf passed to Cleaker
```

If Cleaker can parse the leaf, `syntaxValid: true` and `namespaceValid: true`. If Cleaker rejects the leaf, `namespaceValid: false` — the expression may still be sent, but the server will re-verify.

Two validity flags:

| Flag | Meaning |
|---|---|
| `syntaxValid` | Algebra structure is correct (operators, parens, etc.) |
| `namespaceValid` | All leaves pass Cleaker validation |

---

## `me://` Scheme

Cleaker also handles the `me://` URI scheme. The scheme is stripped before parsing:

```txt
me://jabellae.cleaker.me/photos/iphone
  → base: jabellae.cleaker.me
  → path: photos/iphone
```

This means NRP expressions and `me://` URIs share the same leaf grammar.

---

## See Also

- [The Cleaker Model](./The-Model.md)
- [NRP Expression Parser](../../../neurons-me.github.io/docs/NRP/NRPExpression-Parser.md)
- [.me Kernel Role in NRP](../../me/Typescript/typedocs/NRP-Kernel-Role.md)
