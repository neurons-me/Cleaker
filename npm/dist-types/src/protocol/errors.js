export class CleakerError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = 'CleakerError';
        this.code = code;
        this.details = details;
    }
}
export class CleakerParseError extends CleakerError {
    constructor(message, details) {
        super('PARSE_TARGET_FAILED', message, details);
        this.name = 'CleakerParseError';
    }
}
export class CleakerResolverError extends CleakerError {
    constructor(message, details) {
        super('RESOLVE_FAILED', message, details);
        this.name = 'CleakerResolverError';
    }
}
//# sourceMappingURL=errors.js.map