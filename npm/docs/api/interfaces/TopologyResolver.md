[**cleaker**](../README.md)

***

[cleaker](../README.md) / TopologyResolver

# Interface: TopologyResolver

Defined in: [topology/resolver.ts:31](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/topology/resolver.ts#L31)

TopologyResolver is the boundary between Cleaker and the network layer.

Cleaker owns contextual meaning: name + space = namespace.
A resolver owns reachability: namespace/surface -> endpoint.

NetGet is expected to implement this interface, but Cleaker does not manage
ports, tunnels, relays, or WAN state directly.

## Methods

### register()?

> `optional` **register**(`input`): `Promise`\<`void`\>

Defined in: [topology/resolver.ts:33](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/topology/resolver.ts#L33)

#### Parameters

##### input

[`RegisterSurfaceInput`](RegisterSurfaceInput.md)

#### Returns

`Promise`\<`void`\>

***

### resolve()

> **resolve**(`input`): `Promise`\<[`SurfaceEndpoint`](SurfaceEndpoint.md) \| `null`\>

Defined in: [topology/resolver.ts:32](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/topology/resolver.ts#L32)

#### Parameters

##### input

[`ResolveSurfaceInput`](ResolveSurfaceInput.md)

#### Returns

`Promise`\<[`SurfaceEndpoint`](SurfaceEndpoint.md) \| `null`\>
