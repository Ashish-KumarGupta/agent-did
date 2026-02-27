export interface AgentRegistryRecord {
  did: string;
  controller: string;
  createdAt: string;
  revokedAt?: string;
  documentRef?: string;
}

export interface AgentRegistry {
  register(did: string, controller: string, documentRef?: string): Promise<void>;
  setDocumentReference(did: string, documentRef: string): Promise<void>;
  revoke(did: string): Promise<void>;
  getRecord(did: string): Promise<AgentRegistryRecord | null>;
  isRevoked(did: string): Promise<boolean>;
}
