# RFC-001 Implementation Backlog

## Objetivo

Traducir los hallazgos de `RFC-001-Compliance-Checklist` a trabajo implementable con prioridad, dependencias y criterios de aceptación verificables.

---

## Épica P1 — Conformidad robusta RFC-001

### P1-01 — Evolución de documento DID (`updateDidDocument`)

**Problema:** El RFC exige identidad persistente con estado mutable, pero el SDK no expone actualización/versionado del documento.

**Alcance técnico:**

- Agregar API `updateDidDocument(did, patch)` en `AgentIdentity`.
- Validar que `id` permanece estable y `updated` cambia.
- Permitir actualización de `agentMetadata` (incluyendo hashes y capacidades).

**Criterios de aceptación:**

1. Existe método público y tipado en el SDK.
2. Test cubre actualización exitosa y rechazo de DID inexistente/revocado.
3. `resolve(did)` devuelve versión actualizada del documento.

**Dependencias:** Ninguna.

---

### P1-02 — Soporte de múltiples `verificationMethod` + rotación de claves

**Problema:** `verifySignature` usa solo `verificationMethod[0]`; no hay política de rotación.

**Alcance técnico:**

- Extender modelo para múltiples claves activas.
- Agregar API de rotación (`rotateVerificationMethod` o equivalente).
- Actualizar verificador para seleccionar clave por `keyid` o fallback controlado.

**Criterios de aceptación:**

1. Verificación funciona para clave activa nueva.
2. Clave revocada/obsoleta falla en verificación.
3. Tests cubren al menos 2 ciclos de rotación.

**Dependencias:** P1-01.

---

### P1-03 — Anchoring del documento en registry (`documentUri`/`documentHash`)

**Problema:** El RFC exige referencia on-chain al documento; el contrato actual no la guarda.

**Alcance técnico:**

- Extender `AgentRegistry.sol` con `documentUri` o `documentHash`.
- Actualizar ABI/adaptadores (`EvmAgentRegistry`, `EthersAgentRegistryContractClient`).
- Registrar referencia desde `create` y actualizarla desde `updateDidDocument`.

**Criterios de aceptación:**

1. `getAgentRecord` retorna referencia de documento.
2. Smoke test verifica create + resolve usando referencia on-chain.
3. Compatibilidad ABI documentada (versionado de contrato).

**Dependencias:** P1-01.

---

## Épica P2 — Producción e interoperabilidad

### P2-01 — Resolver universal de producción (RPC + IPFS + caché)

**Problema:** Resolver por defecto en memoria no cumple objetivo operativo de interoperabilidad.

**Alcance técnico:**

- Crear `UniversalResolverClient` con:
  - resolución por DID a registro on-chain,
  - fetch de documento off-chain,
  - caché TTL.
- Mantener `InMemoryDIDResolver` para tests/local.

**Criterios de aceptación:**

1. Resolución funciona para DID no creado en proceso local.
2. Métrica básica de caché (hit/miss) disponible.
3. Tests de integración con adaptador mock de red.

**Dependencias:** P1-03.

---

### P2-02 — Normalización temporal (ISO vs Unix)

**Problema:** SDK usa ISO-8601 y contrato usa Unix-string.

**Alcance técnico:**

- Definir formato canónico (recomendado: ISO-8601 en documento, Unix en contrato con conversión explícita).
- Añadir conversores utilitarios y validaciones de formato.

**Criterios de aceptación:**

1. Regla temporal documentada en RFC + checklist.
2. Sin ambigüedad en tipos/serialización del SDK.
3. Tests de serialización/deserialización pasan.

**Dependencias:** P1-03.

---

### P2-03 — Conformance suite MUST/SHOULD automatizada

**Problema:** La conformidad está documentada, pero no automatizada en pipeline.

**Alcance técnico:**

- Crear suite `conformance:rfc001`.
- Mapear cada MUST a un caso de prueba trazable.
- Agregar salida resumida de cumplimiento.

**Criterios de aceptación:**

1. Pipeline reporta estado por control (PASS/PARTIAL/FAIL).
2. Suite falla si cualquier MUST falla.
3. Evidencia de ejecución en CI local o workflow.

**Dependencias:** P1-01, P1-02, P1-03.

---

## Orden de ejecución recomendado

1. P1-01
2. P1-02
3. P1-03
4. P2-01
5. P2-02
6. P2-03

---

## Definición de Done global

Una tarea se considera cerrada cuando:

1. Implementación mergeada en rama principal.
2. Tests unitarios/integración asociados en verde.
3. Referencias de documentación actualizadas (`RFC`, `Checklist`, `README`).
4. Smoke relevante ejecutado sin regresiones.
