export interface NamespacePublicKey {
  kid: string;
  alg: string;
  key: string;
}

export interface NamespaceSelectorPolicy {
  visibility?: 'public' | 'private' | 'scoped';
  protocols?: string[];
  auth?: string[];
}

export interface NamespaceHostRecord {
  id: string;
  endpoints: string[];
  transport?: string[];
  attrs?: Record<string, unknown>;
}

export interface NamespaceRecord {
  constant: string;
  version: number;
  publicKeys: NamespacePublicKey[];
  selectors: Record<string, NamespaceSelectorPolicy>;
  hosts: NamespaceHostRecord[];
  signature?: string;
}

export interface NamespaceSelectorAtom {
  key: string;
  value: string;
  raw: string;
}

export type NamespaceSelectorClause = NamespaceSelectorAtom[];
export type NamespaceSelectorSet = NamespaceSelectorClause[];

export interface ParsedNamespaceExpression {
  raw: string;
  expression: string;
  base: string;
  fqdn: string;
  prefix: string | null;
  constant: string;
  labels: string[];
  contextRaw: string | null;
  context: NamespaceSelectorSet;
  operation: string | null;
  path: string;
  transport: {
    protocol: 'http' | 'https';
    host: string;
    port: number | null;
    origin: string;
  };
}
