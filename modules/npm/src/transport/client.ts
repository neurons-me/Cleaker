import type { ResolveResult } from '../resolver/resolver';

export interface CleakerTransportClient {
  connect(resolution: ResolveResult): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
