export type SurfaceTransport = 'http' | 'https' | 'ws' | 'quic' | 'relay';

export interface SurfaceEndpoint {
  url: string;
  transport: SurfaceTransport;
  surface?: string;
  lastSeen?: number;
  metadata?: Record<string, unknown>;
}

export interface ResolveSurfaceInput {
  namespace: string;
  selector?: string;
}

export interface RegisterSurfaceInput {
  namespace: string;
  surface: string;
  endpoint: SurfaceEndpoint;
}

/**
 * TopologyResolver is the boundary between Cleaker and the network layer.
 *
 * Cleaker owns contextual meaning: name + space = namespace.
 * A resolver owns reachability: namespace/surface -> endpoint.
 *
 * NetGet is expected to implement this interface, but Cleaker does not manage
 * ports, tunnels, relays, or WAN state directly.
 */
export interface TopologyResolver {
  resolve(input: ResolveSurfaceInput): Promise<SurfaceEndpoint | null>;
  register?(input: RegisterSurfaceInput): Promise<void>;
}
