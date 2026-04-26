import type { CleakerTransportClient } from './client';
import type { ResolvePointerResult } from '../types/pointer';
export declare class HttpTransportClient implements CleakerTransportClient {
    private connected;
    private endpoint;
    connect(resolution: ResolvePointerResult): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=http.d.ts.map