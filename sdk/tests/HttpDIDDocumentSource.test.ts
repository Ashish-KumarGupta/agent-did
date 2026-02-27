import { HttpDIDDocumentSource } from '../src/resolver/HttpDIDDocumentSource';

describe('HttpDIDDocumentSource', () => {
  const sampleDocument = {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://agent-did.org/v1'],
    id: 'did:agent:polygon:0xhttp',
    controller: 'did:ethr:0xcontroller',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    agentMetadata: {
      name: 'HttpResolverBot',
      version: '1.0.0',
      coreModelHash: 'hash://sha256/model',
      systemPromptHash: 'hash://sha256/prompt'
    },
    verificationMethod: [
      {
        id: 'did:agent:polygon:0xhttp#key-1',
        type: 'Ed25519VerificationKey2020',
        controller: 'did:ethr:0xcontroller',
        publicKeyMultibase: 'zabc'
      }
    ],
    authentication: ['did:agent:polygon:0xhttp#key-1']
  };

  it('should fetch and return document when response is OK', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleDocument
    });

    const source = new HttpDIDDocumentSource({
      fetchFn,
      referenceToUrl: (ref) => `https://resolver.example/doc/${encodeURIComponent(ref)}`
    });

    const result = await source.getByReference('hash://sha256/example');
    expect(result?.id).toEqual(sampleDocument.id);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should return null on 404', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({})
    });

    const source = new HttpDIDDocumentSource({ fetchFn });
    const result = await source.getByReference('hash://sha256/missing');
    expect(result).toBeNull();
  });

  it('should fail over across endpoints until one succeeds', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => sampleDocument });

    const source = new HttpDIDDocumentSource({
      fetchFn,
      referenceToUrls: (ref) => [
        `https://resolver-1.example/doc/${encodeURIComponent(ref)}`,
        `https://resolver-2.example/doc/${encodeURIComponent(ref)}`,
        `https://resolver-3.example/doc/${encodeURIComponent(ref)}`
      ]
    });

    const result = await source.getByReference('hash://sha256/failover');
    expect(result?.id).toEqual(sampleDocument.id);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('should throw when all endpoints fail with non-404 errors', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockRejectedValueOnce(new Error('network timeout'));

    const source = new HttpDIDDocumentSource({
      fetchFn,
      referenceToUrls: (ref) => [
        `https://resolver-1.example/doc/${encodeURIComponent(ref)}`,
        `https://resolver-2.example/doc/${encodeURIComponent(ref)}`
      ]
    });

    await expect(source.getByReference('hash://sha256/unavailable')).rejects.toThrow(
      'Failed to fetch DID document from all endpoints'
    );
  });

  it('should resolve ipfs references using configured gateways with failover', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => sampleDocument });

    const source = new HttpDIDDocumentSource({
      fetchFn,
      ipfsGateways: [
        'https://gateway-a.example/ipfs',
        'https://gateway-b.example/ipfs/'
      ]
    });

    const result = await source.getByReference('ipfs://bafybeigdyrztcid/example.json');
    expect(result?.id).toEqual(sampleDocument.id);
    expect(fetchFn).toHaveBeenNthCalledWith(1, 'https://gateway-a.example/ipfs/bafybeigdyrztcid/example.json');
    expect(fetchFn).toHaveBeenNthCalledWith(2, 'https://gateway-b.example/ipfs/bafybeigdyrztcid/example.json');
  });
});
