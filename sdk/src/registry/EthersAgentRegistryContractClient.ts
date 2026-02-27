import { AgentRegistryRecord } from './types';
import { EvmAgentRegistryContract, EvmTxResponse } from './evm-types';
import { normalizeTimestampToIso } from '../core/time';

interface EthersLikeContract {
  registerAgent?: (did: string, controller: string, documentRef?: string) => Promise<EvmTxResponse | void>;
  setDocumentRef?: (did: string, documentRef: string) => Promise<EvmTxResponse | void>;
  revokeAgent?: (did: string) => Promise<EvmTxResponse | void>;
  getAgentRecord?: (did: string) => Promise<AgentRegistryRecord | null>;
  isRevoked?: (did: string) => Promise<boolean>;
}

export class EthersAgentRegistryContractClient implements EvmAgentRegistryContract {
  private readonly contract: EthersLikeContract;

  constructor(contract: EthersLikeContract) {
    this.contract = contract;
  }

  public async registerAgent(did: string, controller: string): Promise<EvmTxResponse | void> {
    if (!this.contract.registerAgent) {
      throw new Error('Contract method not available: registerAgent(did, controller)');
    }

    return this.contract.registerAgent(did, controller);
  }

  public async setDocumentRef(did: string, documentRef: string): Promise<EvmTxResponse | void> {
    if (!this.contract.setDocumentRef) {
      throw new Error('Contract method not available: setDocumentRef(did, documentRef)');
    }

    return this.contract.setDocumentRef(did, documentRef);
  }

  public async revokeAgent(did: string): Promise<EvmTxResponse | void> {
    if (!this.contract.revokeAgent) {
      throw new Error('Contract method not available: revokeAgent(did)');
    }

    return this.contract.revokeAgent(did);
  }

  public async getAgentRecord(did: string): Promise<AgentRegistryRecord | null> {
    if (!this.contract.getAgentRecord) {
      throw new Error('Contract method not available: getAgentRecord(did)');
    }

    const rawRecord = await this.contract.getAgentRecord(did);

    if (!rawRecord) {
      return null;
    }

    if (Array.isArray(rawRecord)) {
      const [recordDid, controller, createdAt, revokedAt, documentRef] = rawRecord;
      return {
        did: String(recordDid),
        controller: String(controller),
        createdAt: normalizeTimestampToIso(String(createdAt)) || String(createdAt),
        revokedAt: normalizeTimestampToIso(String(revokedAt || '')),
        documentRef: String(documentRef || '') || undefined
      };
    }

    return {
      did: String((rawRecord as AgentRegistryRecord).did),
      controller: String((rawRecord as AgentRegistryRecord).controller),
      createdAt: normalizeTimestampToIso(String((rawRecord as AgentRegistryRecord).createdAt))
        || String((rawRecord as AgentRegistryRecord).createdAt),
      revokedAt: normalizeTimestampToIso((rawRecord as AgentRegistryRecord).revokedAt),
      documentRef: (rawRecord as AgentRegistryRecord).documentRef
        ? String((rawRecord as AgentRegistryRecord).documentRef)
        : undefined
    };
  }

  public async isRevoked(did: string): Promise<boolean> {
    if (!this.contract.isRevoked) {
      const record = await this.getAgentRecord(did);
      return Boolean(record?.revokedAt);
    }

    return this.contract.isRevoked(did);
  }
}
