import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { CleakerNode, MeKernel } from './types/kernel';
export interface BindKernelOptions extends CreateRemotePointerOptions {
    namespace?: string;
    identityHash?: string;
    space?: string;
    bootstrap?: string[];
    /**
     * Origins a SIGNED proof (signIn / claim) may be presented to when the destinations this node was built for do not
     * answer. Empty by default: discovery may look for candidates, but presenting a signature requires a destination that was
     * selected. The built-in defaults (the public cleaker.me, localhost) are NOT fallbacks for a signed proof; they are used
     * only when nothing else was selected at all.
     */
    fallbackOrigins?: string[];
    /**
     * Which DISCOVERED sources may, in addition to the declared transport, receive a SIGNED proof. Empty by default.
     * Discovery itself (listing candidate origins for reads and host validation) is not affected by this: it always looks.
     * This only decides what discovery may AUTHORIZE for a signature:
     *   'location'     the page's own origin (window.location)
     *   'environment'  CLEAKER_NAMESPACE_ROOT / CLEAKER_NAMESPACE_HOST
     *   'machine'      this machine's hostname
     *   'defaults'     the built-in public cleaker.me and localhost
     *   'namespace'    the origin the signed namespace's own name resolves to
     * A source listed here is a statement by the caller that a signature may go there; nothing is inferred from it.
     */
    authorizeDiscovered?: Array<'location' | 'environment' | 'machine' | 'defaults' | 'namespace'>;
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