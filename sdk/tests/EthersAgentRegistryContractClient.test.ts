import { EthersAgentRegistryContractClient } from '../src/registry/EthersAgentRegistryContractClient';

describe('EthersAgentRegistryContractClient', () => {
  it('should parse tuple-like contract response into AgentRegistryRecord', async () => {
    const contract = {
      registerAgent: jest.fn(),
      setDocumentRef: jest.fn(),
      revokeAgent: jest.fn(),
      getAgentRecord: jest.fn().mockResolvedValue([
        'did:agent:polygon:0xabc',
        'did:ethr:0xcontroller',
        '1740566400',
        '',
        'hash://sha256/document-ref'
      ]),
      isRevoked: jest.fn().mockResolvedValue(false)
    };

    const client = new EthersAgentRegistryContractClient(contract);
    const record = await client.getAgentRecord('did:agent:polygon:0xabc');

    expect(record?.did).toEqual('did:agent:polygon:0xabc');
    expect(record?.controller).toEqual('did:ethr:0xcontroller');
    expect(record?.revokedAt).toBeUndefined();
    expect(record?.documentRef).toEqual('hash://sha256/document-ref');
    expect(record?.createdAt.endsWith('Z')).toBe(true);
    expect(Number.isNaN(Date.parse(record!.createdAt))).toBe(false);
  });
});
