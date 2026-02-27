const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SDK_DIST = path.join(ROOT, 'sdk', 'dist');

function createRpcServer(handler) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const response = await handler(payload);
        res.writeHead(response.httpStatus || 200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(response.payload));
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: String(error) } }));
      }
    });
  });

  return {
    start: () => new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    }),
    stop: () => new Promise((resolve) => server.close(() => resolve()))
  };
}

async function main() {
  let sdk;
  try {
    sdk = require(SDK_DIST);
  } catch {
    throw new Error('SDK dist no encontrado. Ejecuta `npm --prefix sdk run build`.');
  }

  const { AgentIdentity, InMemoryAgentRegistry, InMemoryDIDResolver } = sdk;

  const did = 'did:agent:polygon:0xha';
  const documentRef = 'hash://sha256/ha-doc';
  const document = {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://agent-did.org/v1'],
    id: did,
    controller: 'did:ethr:0xcontroller',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    agentMetadata: {
      name: 'HaDrillBot',
      version: '1.0.0',
      coreModelHash: 'hash://sha256/model',
      systemPromptHash: 'hash://sha256/prompt'
    },
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: 'Ed25519VerificationKey2020',
        controller: 'did:ethr:0xcontroller',
        publicKeyMultibase: 'zabc'
      }
    ],
    authentication: [`${did}#key-1`]
  };

  const primaryDown = createRpcServer(async (payload) => ({
    httpStatus: 503,
    payload: { jsonrpc: '2.0', id: payload.id ?? null, error: { code: -32000, message: 'primary down' } }
  }));

  const secondaryNotFound = createRpcServer(async (payload) => ({
    payload: { jsonrpc: '2.0', id: payload.id ?? null, error: { code: -32004, message: 'not found on secondary' } }
  }));

  const tertiaryHealthy = createRpcServer(async (payload) => {
    if (payload.method !== 'agent_resolveDocumentRef') {
      return { payload: { jsonrpc: '2.0', id: payload.id ?? null, error: { code: -32601, message: 'method not found' } } };
    }

    const params = Array.isArray(payload.params) ? payload.params : [];
    if (params[0] !== documentRef) {
      return { payload: { jsonrpc: '2.0', id: payload.id ?? null, error: { code: -32004, message: 'not found' } } };
    }

    return { payload: { jsonrpc: '2.0', id: payload.id ?? null, result: document } };
  });

  const primaryPort = await primaryDown.start();
  const secondaryPort = await secondaryNotFound.start();
  const tertiaryPort = await tertiaryHealthy.start();

  try {
    const registry = new InMemoryAgentRegistry();
    await registry.register(did, document.controller, documentRef);

    AgentIdentity.setRegistry(registry);
    AgentIdentity.setResolver(new InMemoryDIDResolver());

    const events = [];
    AgentIdentity.useProductionResolverFromJsonRpc({
      registry,
      cacheTtlMs: 60_000,
      endpoints: [
        `http://127.0.0.1:${primaryPort}`,
        `http://127.0.0.1:${secondaryPort}`,
        `http://127.0.0.1:${tertiaryPort}`
      ],
      onResolutionEvent: (event) => events.push(event.stage)
    });

    const first = await AgentIdentity.resolve(did);
    const second = await AgentIdentity.resolve(did);

    if (first.id !== did || second.id !== did) {
      throw new Error('Resolución DID fallida durante drill HA');
    }

    const requiredStages = ['cache-miss', 'registry-lookup', 'source-fetch', 'source-fetched', 'resolved', 'cache-hit'];
    for (const stage of requiredStages) {
      if (!events.includes(stage)) {
        throw new Error(`Evento requerido ausente en drill HA: ${stage}`);
      }
    }

    console.log('✅ HA resolver drill completed successfully');
  } finally {
    await Promise.all([primaryDown.stop(), secondaryNotFound.stop(), tertiaryHealthy.stop()]);
  }
}

main().catch((error) => {
  console.error('❌ HA resolver drill failed');
  console.error(error);
  process.exit(1);
});
