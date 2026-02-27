# RFC-001 Resolver HA Runbook

## Objetivo

Establecer prácticas operativas para un `Universal Resolver` con alta disponibilidad (HA), cache y failover verificable para cumplimiento de RFC-001.

## Alcance

- Resolver universal con múltiples fuentes (`HTTP`, `IPFS`, `JSON-RPC`).
- Cache con TTL y observabilidad por evento de resolución.
- Pruebas periódicas de resiliencia mediante drill automatizado.

## Perfil recomendado de producción

1. **Topología mínima**
   - 3 endpoints por fuente lógica (ej. `rpc-a`, `rpc-b`, `rpc-c`).
   - Distribución multi-zona por proveedor/región.
   - Balanceo por prioridad + failover secuencial.

2. **Parámetros de operación**
   - `cacheTtlMs`: 30s–120s según volatilidad del documento.
   - Timeout por endpoint: 1s–3s (aplicado en cliente/infra).
   - Reintentos por endpoint: 0–1 (preferir cambio de endpoint).

3. **Fuentes de resolución**
   - HTTP/IPFS para referencias de documento (`documentRef`).
   - JSON-RPC para backend canónico de resolución.
   - Fallback de resolver local/in-memory solo para contingencia controlada.

## SLO/SLA operativos (base)

- **Disponibilidad de resolución**: >= 99.9% mensual.
- **Latencia p95 de resolución**: <= 750 ms.
- **Error rate de resolución**: <= 1.0% (ventana 5 min).
- **Failover success rate**: >= 99% cuando un endpoint primario falla.

## Señales y alertas

Monitorear eventos emitidos por resolver (`cache-hit`, `cache-miss`, `registry-lookup`, `source-fetch`, `source-fetched`, `fallback`, `resolved`, `error`).

Alertar cuando:

- `error` > 1% en 5 minutos.
- `fallback` > 10% sostenido en 15 minutos.
- `resolved` cae por debajo de umbral esperado.
- p95 de `durationMs` excede 750 ms por 10 minutos.

## Procedimiento de drill HA

Ejecutar:

- `npm run smoke:ha`

Validaciones del drill:

1. Endpoint primario falla de forma controlada.
2. Resolver continúa en endpoint secundario/terciario.
3. DID se resuelve correctamente.
4. Se observan eventos de failover y resolución final.
5. Se verifica cache hit en segunda resolución.

## Respuesta a incidentes

1. Confirmar degradación (`error`, `fallback`, p95 latencia).
2. Aislar endpoint defectuoso del pool.
3. Forzar enrutamiento a endpoints sanos.
4. Ejecutar `smoke:ha` post-mitigación.
5. Registrar RCA y acciones preventivas.

## Evidencia de cumplimiento

- Script de drill: `scripts/resolver-ha-smoke.js`
- Ejecución en pipeline de conformidad: `scripts/conformance-rfc001.js`
- Estado de cumplimiento: `docs/RFC-001-Compliance-Checklist.md`
