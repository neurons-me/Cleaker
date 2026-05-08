[**cleaker**](../README.md)

***

[cleaker](../README.md) / CleakerOptions

# Interface: CleakerOptions

Defined in: [cleaker.ts:12](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/cleaker.ts#L12)

## Extends

- `CreateRemotePointerOptions`.`Pick`\<`BindKernelOptions`, `"namespace"` \| `"secret"` \| `"identityHash"` \| `"space"` \| `"bootstrap"` \| `"fetcher"`\>

## Properties

### bootstrap?

> `optional` **bootstrap?**: `string`[]

Defined in: [binder.ts:72](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/binder.ts#L72)

#### Inherited from

`Pick.bootstrap`

***

### cacheTtl?

> `optional` **cacheTtl?**: `number`

Defined in: [pointer/remotePointer.ts:12](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/pointer/remotePointer.ts#L12)

#### Inherited from

`CreateRemotePointerOptions.cacheTtl`

***

### fetcher?

> `optional` **fetcher?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [binder.ts:73](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/binder.ts#L73)

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`URL` \| `RequestInfo`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `URL` \| `Request`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Inherited from

`Pick.fetcher`

***

### identityHash?

> `optional` **identityHash?**: `string`

Defined in: [binder.ts:70](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/binder.ts#L70)

#### Inherited from

`Pick.identityHash`

***

### namespace?

> `optional` **namespace?**: `string`

Defined in: [binder.ts:68](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/binder.ts#L68)

#### Inherited from

`Pick.namespace`

***

### preferredTransport?

> `optional` **preferredTransport?**: `string`[]

Defined in: [pointer/remotePointer.ts:11](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/pointer/remotePointer.ts#L11)

#### Inherited from

`CreateRemotePointerOptions.preferredTransport`

***

### resolveLocalTarget?

> `optional` **resolveLocalTarget?**: (`target`) => `unknown`

Defined in: [pointer/remotePointer.ts:13](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/pointer/remotePointer.ts#L13)

#### Parameters

##### target

[`ParsedTarget`](ParsedTarget.md)

#### Returns

`unknown`

#### Inherited from

`CreateRemotePointerOptions.resolveLocalTarget`

***

### secret?

> `optional` **secret?**: `string`

Defined in: [binder.ts:69](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/binder.ts#L69)

#### Inherited from

`Pick.secret`

***

### space?

> `optional` **space?**: `string`

Defined in: [binder.ts:71](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/binder.ts#L71)

#### Inherited from

`Pick.space`
