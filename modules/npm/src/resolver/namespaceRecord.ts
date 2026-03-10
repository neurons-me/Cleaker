import type { NamespaceRecord } from '../types/namespace';

export interface NamespaceRecordSource {
  get(constant: string): Promise<NamespaceRecord | null>;
}
