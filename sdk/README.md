# @agent-did/sdk

TypeScript SDK para crear, resolver, firmar y verificar Agent-DIDs basados en RFC-001.

## Estado actual

- Creación de documento Agent-DID con hashing de metadatos sensibles.
- Firma de mensajes y firma de requests HTTP.
- Resolución y verificación de firma (resolver en memoria por defecto).
- Registry en memoria con revocación.
- Adaptador EVM listo para conectar contrato real (`AgentRegistry.sol`) mediante `ethers`.

## Instalación

```bash
npm install @agent-did/sdk ethers
```

## Uso básico

```ts
import { AgentIdentity } from '@agent-did/sdk';
import { ethers } from 'ethers';

const wallet = new ethers.Wallet(process.env.CREATOR_PRIVATE_KEY!);
const identity = new AgentIdentity({ signer: wallet, network: 'polygon' });

const { document, agentPrivateKey } = await identity.create({
  name: 'SupportBot-X',
  coreModel: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful assistant'
});

const payload = 'approve:ticket:123';
const signature = await identity.signMessage(payload, agentPrivateKey);
const isValid = await AgentIdentity.verifySignature(document.id, payload, signature);
```

## Conectar registry EVM real

Revisa el ejemplo completo en `sdk/examples/evm-registry-wiring.ts`.

Ese ejemplo carga ABI desde archivo: `sdk/examples/abi/AgentRegistry.abi.json`.
Para generarlo o refrescarlo:

```bash
cd contracts
npm run build
npm run export:abi
```

Para validar el flujo completo local (nodo + deploy + ABI + SDK), desde la raíz del repo:

```bash
npm run smoke:e2e
```

Puntos clave:

1. Crear `ethers.Contract` con ABI mínima del registry.
2. Envolverlo con `EthersAgentRegistryContractClient`.
3. Crear `EvmAgentRegistry`.
4. Inyectarlo con `AgentIdentity.setRegistry(...)`.

## Limitaciones actuales

- Resolver por defecto en memoria (no persistente).
- No incluye implementación productiva de resolver IPFS/RPC todavía.
- El adaptador EVM asume que el contrato expone `registerAgent`, `revokeAgent`, `getAgentRecord` (o `isRevoked`).
- En integración EVM, `createdAt`/`revokedAt` se consumen como strings (normalmente timestamp Unix serializado).
