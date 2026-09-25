import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { CleakerNode, MeKernel } from './types/kernel';
export interface BindKernelOptions extends CreateRemotePointerOptions {
    namespace?: string;
    identityHash?: string;
    space?: string;
    bootstrap?: string[];
    fetcher?: typeof fetch;
    /**
     * Opt-in: keep every RemoteSlot this kernel creates live over the
     * monad's own /nrp WebSocket channel (live/liveChannel.ts), instead of
     * the default fetch-once-and-cache behavior. Off by default -- a caller
     * that never reads a remote path pays nothing, and one that reads a few
     * paths without needing live updates isn't forced into holding an open
     * socket. Requires `bootstrap` (the live channel derives its ws(s):// URL
     * from the first bootstrap origin) and a resolvable namespace at the
     * point a slot is first created; silently stays fetch-once otherwise
     * (see ensureLiveChannel()) rather than throwing -- a caller that opted
     * in too early just gets ordinary behavior, not a broken session.
     */
    live?: boolean;
}
export declare function bindKernel(me: MeKernel, options?: BindKernelOptions): CleakerNode;
//# sourceMappingURL=binder.d.ts.map