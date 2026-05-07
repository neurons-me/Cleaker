[**cleaker**](../README.md)

***

[cleaker](../README.md) / parseTarget

# Function: parseTarget()

> **parseTarget**(`input`, `options?`): [`ParsedTarget`](../interfaces/ParsedTarget.md)

Defined in: [parse/parseTarget.ts:10](https://github.com/neurons-me/cleaker/blob/345c8e4dd9d2928863ec10b410a8161c579106aa/npm/src/parse/parseTarget.ts#L10)

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
