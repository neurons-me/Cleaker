import { CleakerResolverError } from '../protocol/errors';
export class CleakerResolver {
    source;
    constructor(source) {
        this.source = source;
    }
    async resolve(target) {
        const record = await this.source.get(target.namespace.constant);
        if (!record) {
            throw new CleakerResolverError('Namespace record not found', {
                constant: target.namespace.constant,
            });
        }
        const selectorPolicy = record.selectors[target.intent.selector];
        if (!selectorPolicy) {
            throw new CleakerResolverError('Selector is not published by namespace', {
                constant: record.constant,
                selector: target.intent.selector,
            });
        }
        const host = record.hosts[0] ?? null;
        const endpoint = host?.endpoints?.[0] ?? null;
        const protocol = host?.transport?.[0] ?? selectorPolicy.protocols?.[0] ?? null;
        return {
            target,
            namespaceRecord: record,
            endpoint,
            protocol,
        };
    }
}
//# sourceMappingURL=resolver.js.map