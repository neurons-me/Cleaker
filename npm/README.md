# cleaker

##### Stay local with `me`. Enter the network with `cleaker(me)`.

```ts
me["@"]("suiGn")// who are you
cleaker(me, "sui-laptop.local:8181")// here
```

Examples:

```typescript
// Form 1 — explícit
me["@"]("suiGn")
cleaker(me, 'sui-laptop.local:8181') //me , where

// Form 2 — space inside expression
me["@"]("suiGn").space("neurons.me")
cleaker(me) // it knows the space from the .me expression.

// Form 3 — all together
me["@"]("suiGn.neurons.me")
cleaker(me) // reads the complete fqdn 
```

**Responsabilidades finales:**

| `me["@"]("suiGn")`          | identidad soberana — local, privada, sin red      |
| :-------------------------- | ------------------------------------------------- |
| `cleaker(me, "neurons.me")` | primer acto público — manifiesta `me` en un space |

`me.space` es solo expresión del lenguaje — poética, documentación, conceptual. El acto real lo hace `cleaker`.

**"Who are you, here."**

`here` no tiene que ser un dominio público — puede ser tu laptop, una red local, un nodo privado. El space es literal: dónde estás manifestándote ahora.

------

Esto también significa que `cleaker` tiene que parsear el space correctamente:

```ts
cleaker(me, "sui-laptop.local:8181")  // dev local
cleaker(me, "neurons.me")             // producción
cleaker(me, "192.168.1.5:8161")       // red privada
```

Y construye el **space** internamente:

```ts
const origin = space.startsWith("http") 
  ? space 
  : `http://${space}`   // local/dev
  // o https:// si es dominio público
```

**"Who are you, here."**

Dos palabras. Dos líneas de código. Todo el sistema.

```ts
me["@"]("suiGn")
cleaker(me, "neurons.me")
```

Y escala naturalmente:

```ts
me["@"]("suiGn")
cleaker(me, "sui-laptop.local:8181")  // desarrollo
cleaker(me, "neurons.me")             // producción
cleaker(me, "192.168.1.5:8161")       // red privada
```

La misma identidad, manifestada en diferentes espacios. `me` nunca cambia. El `here` cambia.
