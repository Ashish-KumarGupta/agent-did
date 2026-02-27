import { AgentRegistry, AgentRegistryRecord } from './types';

export class InMemoryAgentRegistry implements AgentRegistry {
  private readonly records = new Map<string, AgentRegistryRecord>();

  public async register(did: string, controller: string, documentRef?: string): Promise<void> {
    const existing = this.records.get(did);

    if (existing) {
      return;
    }

    this.records.set(did, {
      did,
      controller,
      createdAt: new Date().toISOString(),
      documentRef
    });
  }

  public async setDocumentReference(did: string, documentRef: string): Promise<void> {
    const existing = this.records.get(did);

    if (!existing) {
      throw new Error(`DID not found in registry: ${did}`);
    }

    this.records.set(did, {
      ...existing,
      documentRef
    });
  }

  public async revoke(did: string): Promise<void> {
    const existing = this.records.get(did);

    if (!existing) {
      throw new Error(`DID not found in registry: ${did}`);
    }

    this.records.set(did, {
      ...existing,
      revokedAt: new Date().toISOString()
    });
  }

  public async getRecord(did: string): Promise<AgentRegistryRecord | null> {
    return this.records.get(did) || null;
  }

  public async isRevoked(did: string): Promise<boolean> {
    const record = this.records.get(did);
    return Boolean(record?.revokedAt);
  }
}
