import type { ResolvePointerResult } from '../types/pointer';

export interface CleakerTransportClient {
  connect(resolution: ResolvePointerResult): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
