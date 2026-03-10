export type NamespaceClaimInput = {
  namespace: string;
  secret: string;
  publicKey?: string | null;
};

export type NamespaceOpenInput = {
  namespace: string;
  secret: string;
};

export type ClaimRecord = {
  namespace: string;
  identityHash: string;
  encryptedNoise: string;
  publicKey?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ClaimNamespaceResult =
  | { ok: true; record: ClaimRecord; noise: string }
  | {
      ok: false;
      error:
        | "NAMESPACE_REQUIRED"
        | "SECRET_REQUIRED"
        | "NAMESPACE_TAKEN";
    };

export type OpenNamespaceResult =
  | { ok: true; record: ClaimRecord; noise: string }
  | {
      ok: false;
      error:
        | "NAMESPACE_REQUIRED"
        | "SECRET_REQUIRED"
        | "CLAIM_NOT_FOUND"
        | "CLAIM_VERIFICATION_FAILED"
        | "NOISE_DECRYPT_FAILED";
    };
