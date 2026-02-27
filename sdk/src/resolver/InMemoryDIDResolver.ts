import { AgentDIDDocument } from '../core/types';
import { DIDResolver } from './types';

export class InMemoryDIDResolver implements DIDResolver {
  private readonly documentStore = new Map<string, AgentDIDDocument>();

  public registerDocument(document: AgentDIDDocument): void {
    this.documentStore.set(document.id, JSON.parse(JSON.stringify(document)) as AgentDIDDocument);
  }

  public async resolve(did: string): Promise<AgentDIDDocument> {
    const document = this.documentStore.get(did);

    if (!document) {
      throw new Error(`DID not found: ${did}`);
    }

    return JSON.parse(JSON.stringify(document)) as AgentDIDDocument;
  }

  public remove(did: string): void {
    this.documentStore.delete(did);
  }
}
