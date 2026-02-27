# Agent-DID: Identidad verificable para agentes de IA

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Proyecto de referencia para el estándar **Agent-DID (RFC-001)**: identidad descentralizada de agentes con firma criptográfica, resolución de documentos, revocación y trazabilidad de evolución.

## Estado actual

El proyecto ya no está solo en fase de especificación: incluye implementación funcional y pipeline de validación.

- **RFC-001** consolidado y operativo: [docs/RFC-001-Agent-DID-Specification.md](docs/RFC-001-Agent-DID-Specification.md)
- **Checklist de conformidad**: [docs/RFC-001-Compliance-Checklist.md](docs/RFC-001-Compliance-Checklist.md)
- **Resultado vigente**: MUST `11/11 PASS` y SHOULD `5/5 PASS`

## Componentes principales

### 1) SDK TypeScript (`sdk/`)

Incluye:

- Creación de Agent-DID documents (`create`)
- Firma y verificación Ed25519 (`signMessage`, `verifySignature`)
- Firma/verificación HTTP (`signHttpRequest`, `verifyHttpRequestSignature`)
- Resolución DID con caché/failover (`UniversalResolverClient`)
- Fuentes de documento por `HTTP/IPFS` y `JSON-RPC`
- Revocación, actualización de documento, rotación de claves e historial

### 2) Registry EVM (`contracts/`)

Contrato `AgentRegistry` con:

- Registro y revocación de DIDs
- Referencia on-chain al documento (`documentRef`)
- Política formal de acceso de revocación:
	- revocación por `owner` o delegado autorizado por DID
	- delegación explícita (`setRevocationDelegate`)
	- transferencia de ownership (`transferAgentOwnership`)

### 3) Validación y drills (`scripts/`)

- Conformidad completa: `npm run conformance:rfc001`
- E2E SDK + contrato: `npm run smoke:e2e`
- Drill de alta disponibilidad resolver: `npm run smoke:ha`
- Smoke de resolución JSON-RPC: `npm run smoke:rpc`
- Smoke de política de revocación: `npm run smoke:policy`

## Ejecutar localmente

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
npm install
npm --prefix sdk install
npm --prefix contracts install
```

### Verificación rápida recomendada

```bash
npm run conformance:rfc001
```

Este comando ejecuta build/tests del SDK y smokes operativos (policy, HA, RPC, E2E).

## Documentación clave

- Especificación principal: [docs/RFC-001-Agent-DID-Specification.md](docs/RFC-001-Agent-DID-Specification.md)
- Checklist de cumplimiento: [docs/RFC-001-Compliance-Checklist.md](docs/RFC-001-Compliance-Checklist.md)
- Runbook HA de resolver: [docs/RFC-001-Resolver-HA-Runbook.md](docs/RFC-001-Resolver-HA-Runbook.md)
- Guía de contribución: [CONTRIBUTING.md](CONTRIBUTING.md)

## Roadmap

RFC-001 está implementado y conforme. Las próximas iteraciones pueden enfocarse en:

- Nuevos RFCs (delegación avanzada, aprobaciones A2H)
- Integraciones externas y adopción de fixtures compartidos entre implementaciones
- Hardening operacional/CI para entornos de producción multi-región

## Licencia

MIT.
