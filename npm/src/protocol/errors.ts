export class CleakerError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CleakerError';
    this.code = code;
    this.details = details;
  }
}

export class CleakerParseError extends CleakerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PARSE_TARGET_FAILED', message, details);
    this.name = 'CleakerParseError';
  }
}
