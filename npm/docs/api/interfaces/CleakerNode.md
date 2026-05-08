[**cleaker**](../README.md)

***

[cleaker](../README.md) / CleakerNode

# Interface: CleakerNode

Defined in: [types/kernel.ts:36](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L36)

## Extends

- [`MeKernel`](MeKernel.md)

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### currentCycleId

> **currentCycleId**: `number`

Defined in: [types/kernel.ts:43](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L43)

***

### kernel

> **kernel**: [`MeKernel`](MeKernel.md)

Defined in: [types/kernel.ts:37](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L37)

***

### learn?

> `optional` **learn?**: (`memory`) => `void`

Defined in: [types/kernel.ts:23](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L23)

#### Parameters

##### memory

`unknown`

#### Returns

`void`

#### Inherited from

[`MeKernel`](MeKernel.md).[`learn`](MeKernel.md#learn)

***

### noise?

> `optional` **noise?**: `string`

Defined in: [types/kernel.ts:25](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L25)

#### Inherited from

[`MeKernel`](MeKernel.md).[`noise`](MeKernel.md#noise)

***

### ready

> **ready**: `Promise`\<[`OpenNodeResult`](OpenNodeResult.md) \| `null`\>

Defined in: [types/kernel.ts:38](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L38)

***

### replayMemories?

> `optional` **replayMemories?**: (`memories`) => `void`

Defined in: [types/kernel.ts:24](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L24)

#### Parameters

##### memories

`unknown`[]

#### Returns

`void`

#### Inherited from

[`MeKernel`](MeKernel.md).[`replayMemories`](MeKernel.md#replaymemories)

***

### state

> **state**: `CleakerState`

Defined in: [types/kernel.ts:42](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L42)

## Methods

### claim()

> **claim**(`input`): `Promise`\<[`OpenNodeResult`](OpenNodeResult.md)\>

Defined in: [types/kernel.ts:39](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L39)

#### Parameters

##### input

[`OpenNodeInput`](OpenNodeInput.md)

#### Returns

`Promise`\<[`OpenNodeResult`](OpenNodeResult.md)\>

***

### discoverHosts()

> **discoverHosts**(): `CleakerHostRecord`[]

Defined in: [types/kernel.ts:44](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L44)

#### Returns

`CleakerHostRecord`[]

***

### getStatus()

> **getStatus**(): [`CleakerStatus`](CleakerStatus.md)

Defined in: [types/kernel.ts:46](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L46)

#### Returns

[`CleakerStatus`](CleakerStatus.md)

***

### off()

> **off**\<`E`\>(`eventName`, `handler`): `void`

Defined in: [types/kernel.ts:50](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L50)

#### Type Parameters

##### E

`E` *extends* keyof [`CleakerEvents`](CleakerEvents.md)

#### Parameters

##### eventName

`E`

##### handler

[`CleakerEvents`](CleakerEvents.md)\[`E`\]

#### Returns

`void`

***

### on()

> **on**\<`E`\>(`eventName`, `handler`): () => `void`

Defined in: [types/kernel.ts:48](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L48)

#### Type Parameters

##### E

`E` *extends* keyof [`CleakerEvents`](CleakerEvents.md)

#### Parameters

##### eventName

`E`

##### handler

[`CleakerEvents`](CleakerEvents.md)\[`E`\]

#### Returns

() => `void`

***

### once()

> **once**\<`E`\>(`eventName`, `handler`): () => `void`

Defined in: [types/kernel.ts:49](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L49)

#### Type Parameters

##### E

`E` *extends* keyof [`CleakerEvents`](CleakerEvents.md)

#### Parameters

##### eventName

`E`

##### handler

[`CleakerEvents`](CleakerEvents.md)\[`E`\]

#### Returns

() => `void`

***

### pointer()

> **pointer**(`expression`, `options?`): [`RemotePointerDefinition`](RemotePointerDefinition.md)

Defined in: [types/kernel.ts:41](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L41)

#### Parameters

##### expression

`string`

##### options?

[`ResolvePointerOptions`](ResolvePointerOptions.md)

#### Returns

[`RemotePointerDefinition`](RemotePointerDefinition.md)

***

### signIn()

> **signIn**(`input`): `Promise`\<[`OpenNodeResult`](OpenNodeResult.md)\>

Defined in: [types/kernel.ts:40](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L40)

#### Parameters

##### input

[`OpenNodeInput`](OpenNodeInput.md)

#### Returns

`Promise`\<[`OpenNodeResult`](OpenNodeResult.md)\>

***

### validateHosts()

> **validateHosts**(`options?`): `Promise`\<[`CleakerStatus`](CleakerStatus.md)\>

Defined in: [types/kernel.ts:45](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L45)

#### Parameters

##### options?

`ValidateHostsOptions`

#### Returns

`Promise`\<[`CleakerStatus`](CleakerStatus.md)\>

***

### waitUntilReady()

> **waitUntilReady**(`timeoutMs?`): `Promise`\<[`CleakerReadyPayload`](CleakerReadyPayload.md)\>

Defined in: [types/kernel.ts:47](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L47)

#### Parameters

##### timeoutMs?

`number`

#### Returns

`Promise`\<[`CleakerReadyPayload`](CleakerReadyPayload.md)\>
