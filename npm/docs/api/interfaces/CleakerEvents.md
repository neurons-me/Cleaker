[**cleaker**](../README.md)

***

[cleaker](../README.md) / CleakerEvents

# Interface: CleakerEvents

Defined in: [types/kernel.ts:142](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L142)

## Properties

### error

> **error**: (`error`) => `void`

Defined in: [types/kernel.ts:145](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L145)

#### Parameters

##### error

[`CleakerErrorPayload`](CleakerErrorPayload.md)

#### Returns

`void`

***

### host:triad:success

> **host:triad:success**: (`hostId`) => `void`

Defined in: [types/kernel.ts:146](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L146)

#### Parameters

##### hostId

`string`

#### Returns

`void`

***

### namespace:failed

> **namespace:failed**: (`payload`) => `void`

Defined in: [types/kernel.ts:150](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L150)

All surfaces failed; namespace resolution is giving up.

#### Parameters

##### payload

[`NamespaceFailedPayload`](NamespaceFailedPayload.md)

#### Returns

`void`

***

### namespace:fallback

> **namespace:fallback**: (`payload`) => `void`

Defined in: [types/kernel.ts:148](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L148)

A remote surface failed; resolution is retrying on a local fallback.

#### Parameters

##### payload

[`NamespaceFallbackPayload`](NamespaceFallbackPayload.md)

#### Returns

`void`

***

### ready

> **ready**: (`payload`) => `void`

Defined in: [types/kernel.ts:144](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L144)

#### Parameters

##### payload

[`CleakerReadyPayload`](CleakerReadyPayload.md)

#### Returns

`void`

***

### status:change

> **status:change**: (`status`) => `void`

Defined in: [types/kernel.ts:143](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L143)

#### Parameters

##### status

[`CleakerStatus`](CleakerStatus.md)

#### Returns

`void`
