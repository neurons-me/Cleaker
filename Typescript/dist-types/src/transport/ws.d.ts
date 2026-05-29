import type { CleakerTransportClient } from './client';
import type { ResolvePointerResult } from '../types/pointer';
export declare class WsTransportClient implements CleakerTransportClient {
    private connected;
    private endpoint;
    connect(resolution: ResolvePointerResult): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=ws.d.ts.map