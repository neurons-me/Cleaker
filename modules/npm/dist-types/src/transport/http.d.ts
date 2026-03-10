import type { CleakerTransportClient } from './client';
import type { ResolveResult } from '../resolver/resolver';
export declare class HttpTransportClient implements CleakerTransportClient {
    private connected;
    private endpoint;
    connect(resolution: ResolveResult): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=http.d.ts.map