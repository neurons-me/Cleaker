export interface LiveChannelOptions {
    /** HTTP(S) origin the WS URL derives from, e.g. "https://local.cleaker". */
    transportOrigin: string;
    /** The semantic namespace this channel opens against, e.g. "user.local.cleaker". */
    namespace: string;
}
export interface LiveChannel {
    /** Idempotent -- subscribing to an already-active path is a no-op. */
    subscribe(path: string): void;
    /** Idempotent -- unsubscribing from an inactive path is a no-op. */
    unsubscribe(path: string): void;
    /** Fires for every live update pushed for ANY subscribed path. Returns an unsubscribe function. */
    onUpdate(handler: (path: string, value: unknown) => void): () => void;
    /** Closes the underlying WebSocket. Safe to call more than once. */
    disconnect(): void;
}
export declare function createLiveChannel(options: LiveChannelOptions): LiveChannel;
//# sourceMappingURL=liveChannel.d.ts.map