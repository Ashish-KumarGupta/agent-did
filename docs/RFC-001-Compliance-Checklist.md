# RFC-001 Compliance Checklist (Agent-DID)

## Propósito

Este checklist traduce RFC-001 a controles verificables para evaluar conformidad de implementación.

Comando de verificación automatizada:

- `npm run conformance:rfc001`

Escala usada:

- **PASS:** Cumple completamente.
- **PARTIAL:** Cumple parcialmente / con limitaciones.
- **FAIL:** No implementado o no verificable.

---

## A. Controles MUST (obligatorios)

| ID | Control | Estado actual | Evidencia | Acción requerida |
| :-- | :-- | :-- | :-- | :-- |
| MUST-01 | Emitir documento Agent-DID con campos obligatorios (`id`, `controller`, `created`, `updated`, `agentMetadata.coreModelHash`, `agentMetadata.systemPromptHash`, `verificationMethod`, `authentication`) | PASS | `sdk/src/core/types.ts`, `sdk/src/core/AgentIdentity.ts` | Mantener pruebas de regresión de esquema. |
| MUST-02 | Soportar `create(params)` | PASS | `sdk/src/core/AgentIdentity.ts` | Ninguna inmediata. |
| MUST-03 | Soportar `signMessage(payload, privateKey)` | PASS | `sdk/src/core/AgentIdentity.ts` | Añadir vector de pruebas interoperables (futuro). |
| MUST-04 | Soportar `signHttpRequest(params)` con `@request-target`, `host`, `date`, `content-digest`, identidad del agente | PASS | `sdk/src/core/AgentIdentity.ts` (firma/verifica componentes requeridos, soporta etiquetas múltiples y diccionarios de firma), `sdk/tests/AgentIdentity.test.ts` (casos positivos/negativos, tamper, algoritmo no soportado, labels alternativos, múltiples firmas) | Mantener fixtures interoperables y regresión continua en CI. |
| MUST-05 | Soportar `resolve(did)` | PASS | `sdk/src/core/AgentIdentity.ts` (`useProductionResolver`, `useProductionResolverFromHttp`, `useProductionResolverFromJsonRpc`), `sdk/src/resolver/UniversalResolverClient.ts` (cache + eventos), `sdk/src/resolver/HttpDIDDocumentSource.ts` (failover multi-endpoint + `ipfs://` gateways), `sdk/src/resolver/JsonRpcDIDDocumentSource.ts` (failover RPC), `sdk/tests/UniversalResolverClient.test.ts`, `sdk/tests/HttpDIDDocumentSource.test.ts`, `sdk/tests/JsonRpcDIDDocumentSource.test.ts`, `scripts/rpc-resolver-smoke.js` | Mantener monitoreo operativo y pruebas periódicas sobre infraestructura real. |
| MUST-06 | Soportar `verifySignature(did, payload, signature)` y fallar si revocado | PASS | `sdk/src/core/AgentIdentity.ts`, tests | Mantener pruebas con `keyId` y rotación. |
| MUST-07 | Soportar `revokeDid(did)` | PASS | `sdk/src/core/AgentIdentity.ts`, `sdk/src/registry/*` | Añadir política de autorización explícita en interfaces. |
| MUST-08 | Registry con operaciones mínimas (`registerAgent`, `revokeAgent`, `getAgentRecord`, `isRevoked`) | PASS | `contracts/src/AgentRegistry.sol`, `sdk/src/registry/*` | Mantener ABI estable y versionada. |
| MUST-09 | Verificación de conformidad: firma válida antes de revocación e inválida después | PASS | tests smoke + unit (`npm run smoke:e2e`) | Añadir escenario con red externa en CI. |
| MUST-10 | Soportar ciclo de evolución (`updated` + rotación o actualización de `verificationMethod`) | PASS | `sdk/src/core/AgentIdentity.ts`, `sdk/tests/AgentIdentity.test.ts` | Extender con trazabilidad histórica de versiones (SHOULD). |
| MUST-11 | Separación mínima on-chain/off-chain con referencia al documento | PASS | `contracts/src/AgentRegistry.sol`, `sdk/src/core/AgentIdentity.ts`, `sdk/src/registry/*`, `npm run smoke:e2e` | Mantener compatibilidad ABI y versionado. |

---

## B. Controles SHOULD (recomendados)

| ID | Control | Estado actual | Evidencia | Acción recomendada |
| :-- | :-- | :-- | :-- | :-- |
| SHOULD-01 | Resolver universal serverless con caché y alta disponibilidad | PASS | `sdk/src/resolver/UniversalResolverClient.ts` (telemetría de resolución), `sdk/src/resolver/HttpDIDDocumentSource.ts` (failover entre endpoints + gateways IPFS), `sdk/src/resolver/JsonRpcDIDDocumentSource.ts` (failover entre endpoints RPC), `sdk/src/core/AgentIdentity.ts` (`useProductionResolverFromHttp`, `useProductionResolverFromJsonRpc`), `scripts/resolver-ha-smoke.js`, `docs/RFC-001-Resolver-HA-Runbook.md`, `sdk/tests/UniversalResolverClient.test.ts`, `sdk/tests/HttpDIDDocumentSource.test.ts`, `sdk/tests/JsonRpcDIDDocumentSource.test.ts` | Mantener ejecución periódica del drill HA y revisión de SLO/alertas por release. |
| SHOULD-02 | Normalización temporal homogénea entre capa SDK y contrato | PASS | `sdk/src/core/time.ts`, `sdk/src/registry/EthersAgentRegistryContractClient.ts`, `sdk/tests/time.test.ts` | Mantener contratos claros: on-chain Unix-string, SDK expone ISO normalizado. |
| SHOULD-03 | Modo de verificación interoperable con implementaciones externas | PASS | `sdk/tests/fixtures/interop-vectors.json`, `sdk/tests/InteropVectors.test.ts`, `sdk/src/core/AgentIdentity.ts` (verifySignature/verifyHttpRequestSignature) | Mantener y versionar fixtures compartidos por release. |
| SHOULD-04 | Políticas de control de acceso de revocación a nivel contrato | PASS | `contracts/src/AgentRegistry.sol` (`setRevocationDelegate`, `transferAgentOwnership`, `isRevocationDelegate`, `revokeAgent` con `owner|delegate`), `contracts/scripts/revocation-policy-check.js`, `scripts/revocation-policy-smoke.js` | Mantener revisiones de gobernanza y rotación de custodios por release. |
| SHOULD-05 | Trazabilidad de evolución de documento por versión | PASS | `sdk/src/core/AgentIdentity.ts`, `sdk/tests/AgentIdentity.test.ts` | Mantener persistencia histórica al migrar a backend externo. |

---

## C. Resumen ejecutivo de conformidad

- **MUST:** 11 PASS / 0 PARTIAL / 0 FAIL
- **SHOULD:** 5 PASS / 0 PARTIAL / 0 FAIL

Lectura rápida:

1. El núcleo funcional del estándar ya está operativo para create/sign/resolve/verify/revoke.
2. No hay brechas MUST: todos los controles obligatorios están en PASS.
3. La brecha principal de producción es resolver universal real (actualmente en memoria).

---

## D. Plan de cierre sugerido (priorizado)

Backlog ejecutable asociado:

- `docs/RFC-001-Implementation-Backlog.md`

### P1 (bloqueante para conformidad robusta)

1. ✅ Completado.

### P2 (producción)

1. Implementar resolver universal (RPC + IPFS + cache).
2. Normalizar timestamps (ISO o Unix, uno solo).
3. Añadir smoke test de red externa (`smoke:e2e:ci`).

---

## E. Criterio de salida (“RFC-001 conformant”)

Una implementación se marca como conforme cuando:

1. Todos los controles MUST están en PASS.
2. Al menos 3 controles SHOULD están en PASS y ninguno en FAIL para despliegue productivo.
