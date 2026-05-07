[**cleaker**](../README.md)

***

[cleaker](../README.md) / OpenNodeInput

# Interface: OpenNodeInput

Defined in: [types/kernel.ts:4](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/types/kernel.ts#L4)

## Properties

### fetcher?

> `optional` **fetcher?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [types/kernel.ts:10](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/types/kernel.ts#L10)

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

Defined in: [types/kernel.ts:9](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/types/kernel.ts#L9)

***

### identityHash?

> `optional` **identityHash?**: `string`

Defined in: [types/kernel.ts:7](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/types/kernel.ts#L7)

***

### namespace

> **namespace**: `string`

Defined in: [types/kernel.ts:5](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/types/kernel.ts#L5)

***

### secret

> **secret**: `string`

Defined in: [types/kernel.ts:6](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/types/kernel.ts#L6)

***

### space?

> `optional` **space?**: `string`

Defined in: [types/kernel.ts:8](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/types/kernel.ts#L8)
