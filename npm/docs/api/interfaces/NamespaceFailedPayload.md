[**cleaker**](../README.md)

***

[cleaker](../README.md) / NamespaceFailedPayload

# Interface: NamespaceFailedPayload

Defined in: [types/kernel.ts:135](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L135)

Emitted when all surfaces have been tried and the namespace could not be resolved.

## Properties

### explain

> **explain**: `string`

Defined in: [types/kernel.ts:139](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L139)

Human-readable summary of what was tried and why it failed.

***

### namespace

> **namespace**: `string`

Defined in: [types/kernel.ts:136](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L136)

***

### tried

> **tried**: `object`[]

Defined in: [types/kernel.ts:137](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/kernel.ts#L137)

#### origin

> **origin**: `string`

#### reason

> **reason**: `string`
