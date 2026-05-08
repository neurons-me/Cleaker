[**cleaker**](../README.md)

***

[cleaker](../README.md) / ResolvePointerOptions

# Interface: ResolvePointerOptions

Defined in: [types/pointer.ts:58](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/pointer.ts#L58)

## Properties

### fetcher?

> `optional` **fetcher?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [types/pointer.ts:62](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/pointer.ts#L62)

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

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/pointer.ts:61](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/pointer.ts#L61)

***

### host?

> `optional` **host?**: `string`

Defined in: [types/pointer.ts:60](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/pointer.ts#L60)

***

### origin?

> `optional` **origin?**: `string`

Defined in: [types/pointer.ts:59](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/types/pointer.ts#L59)
