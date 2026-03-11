import type { CleakerTransportClient } from './client';
import type { ResolveResult } from '../resolver/resolver';

export class WsTransportClient implements CleakerTransportClient {
  private connected = false;
  private endpoint: string | null = null;

  async connect(resolution: ResolveResult): Promise<void> {
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
