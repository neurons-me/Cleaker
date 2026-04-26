# cleaker

`cleaker` binds a live `.me` kernel to a namespace and hydrates it through `monad.ai`.

It is intentionally narrow:

- `.me` derives identity and proof
- `cleaker` binds and hydrates
- `monad.ai` transports the namespace

## Canonical shape

```ts
const node = cleaker(me, {
  secret,
  namespace?,
  origin?,
});
```

When `secret` is present, the runtime lifecycle is automatic:

```txt
prove -> open -> claim if missing -> reopen -> hydrate
```

See [Runtime](./runtime.md) for the concrete contract.
