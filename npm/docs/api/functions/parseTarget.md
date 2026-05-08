[**cleaker**](../README.md)

***

[cleaker](../README.md) / parseTarget

# Function: parseTarget()

> **parseTarget**(`input`, `options?`): [`ParsedTarget`](../interfaces/ParsedTarget.md)

Defined in: [parse/parseTarget.ts:10](https://github.com/neurons-me/cleaker/blob/272e583d99fa82ffbbdcffea67131710cd047375/npm/src/parse/parseTarget.ts#L10)

Compatibility wrapper for remote pointer targets.

The contextual namespace grammar lives in `parseNamespaceExpression()`;
this parser remains for `cleaker("me://...")` remote pointer support.

## Parameters

### input

`string`

### options?

[`ParseTargetOptions`](../interfaces/ParseTargetOptions.md) = `{}`

## Returns

[`ParsedTarget`](../interfaces/ParsedTarget.md)
