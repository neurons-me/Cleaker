import type { NormalizedMeTarget } from "./meTarget";

type EnvelopeShape = Record<string, unknown>;

export function createEnvelope(
  target: NormalizedMeTarget,
  body: EnvelopeShape = {},
): EnvelopeShape {
  return {
    ok: true,
    operation: target.operation,
    target,
    ...body,
  };
}

export function createErrorEnvelope(
  target: NormalizedMeTarget,
  body: EnvelopeShape = {},
): EnvelopeShape {
  return {
    ok: false,
    operation: target.operation,
    target,
    ...body,
  };
}
