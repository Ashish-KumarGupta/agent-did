const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SDK_DIST = path.join(ROOT, 'sdk', 'dist');

function createJsonRpcServer(handler) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8') || '{}';
        const payload = JSON.parse(body);
        const responseBody = await handler(payload);
        res.writeHead(responseBody.httpStatus || 200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(responseBody.payload));
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: error instanceof Error ? error.message : String(error) }
        }));
      }
    });
  });

  return {
    start: () => new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        resolve(Number(address.port));
      });
    }),
    stop: () => new Promise((resolve) => server.close(() => resolve()))
  };
}

async function main() {
  let sdk;
  try {
    sdk = require(SDK_DIST);
  } catch {
    throw new Error('SDK build not found. Run `npm --prefix sdk run build` before smoke:rpc.');
  }

  const {
    AgentIdentity,
    InMemoryAgentRegistry,
    InMemoryDIDResolver
  } = sdk;

  const did = 'did:agent:polygon:0xrpcsmoke';
  const documentRef = 'hash://sha256/rpc-smoke-doc';
  const sampleDocument = {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://agent-did.org/v1'],
    id: did,
    controller: 'did:ethr:0xcontroller',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    agentMetadata: {
      name: 'RpcSmokeBot',
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

  const failingServer = createJsonRpcServer(async (payload) => ({
    httpStatus: 503,
    payload: {
      jsonrpc: '2.0',
      id: payload.id ?? null,
      error: { code: -32000, message: 'temporary unavailable' }
    }
  }));

  const healthyServer = createJsonRpcServer(async (payload) => {
    const params = Array.isArray(payload.params) ? payload.params : [];
    const requestedRef = params[0];

    if (payload.method !== 'agent_resolveDocumentRef') {
      return {
        payload: {
          jsonrpc: '2.0',
          id: payload.id ?? null,
          error: { code: -32601, message: 'method not found' }
        }
      };
    }

    if (requestedRef !== documentRef) {
      return {
        payload: {
          jsonrpc: '2.0',
          id: payload.id ?? null,
          error: { code: -32004, message: 'document not found' }
        }
      };
    }

    return {
      payload: {
        jsonrpc: '2.0',
        id: payload.id ?? null,
        result: sampleDocument
      }
    };
  });

  const failingPort = await failingServer.start();
  const healthyPort = await healthyServer.start();

  try {
    const registry = new InMemoryAgentRegistry();
    await registry.register(did, sampleDocument.controller, documentRef);

    AgentIdentity.setRegistry(registry);
    AgentIdentity.setResolver(new InMemoryDIDResolver());

    const events = [];
    AgentIdentity.useProductionResolverFromJsonRpc({
      registry,
      endpoints: [
        `http://127.0.0.1:${failingPort}`,
        `http://127.0.0.1:${healthyPort}`
      ],
      onResolutionEvent: (event) => events.push(event.stage)
    });

    const resolved = await AgentIdentity.resolve(did);

    if (resolved.id !== did) {
      throw new Error(`Resolved DID mismatch. Expected ${did}, got ${resolved.id}`);
    }

    if (!events.includes('source-fetch') || !events.includes('resolved')) {
      throw new Error(`Expected resolver events not emitted. Events: ${events.join(', ')}`);
    }

    console.log('✅ RPC resolver smoke test completed successfully');
  } finally {
    await Promise.all([failingServer.stop(), healthyServer.stop()]);
  }
}

main().catch((error) => {
  console.error('❌ RPC resolver smoke test failed');
  console.error(error);
  process.exit(1);
});
