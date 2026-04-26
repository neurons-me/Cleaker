import type { CleakerTransportClient } from './client';
import type { ResolvePointerResult } from '../types/pointer';

export class HttpTransportClient implements CleakerTransportClient {
  private connected = false;
  private endpoint: string | null = null;

  async connect(resolution: ResolvePointerResult): Promise<void> {
    this.endpoint = resolution.endpoint;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.endpoint = null;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
