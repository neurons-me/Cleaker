import type { ParsedTarget } from '../types/target';
export interface ConnectMessage {
    protocol: 'nrp/1';
    op: 'connect';
    target: ParsedTarget;
}
export interface WatchMessage {
    protocol: 'nrp/1';
    op: 'watch';
    target: ParsedTarget;
}
export interface ResolveMessage {
    protocol: 'nrp/1';
    op: 'resolve';
    target: ParsedTarget;
}
export type CleakerMessage = ConnectMessage | WatchMessage | ResolveMessage;
//# sourceMappingURL=messages.d.ts.map