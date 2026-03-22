# F2-04 - Semantic Kernel Parity Matrix

## Objetivo

Comparar la integracion de Semantic Kernel con las otras dos integraciones Python mas relevantes del repositorio:

- CrewAI
- LangChain Python

La comparacion separa tres cosas que antes estaban mezcladas:

1. paridad funcional base
2. paridad operativa verificable
3. divergencias aceptadas de madurez

---

## Matriz

| Dimension | Semantic Kernel | CrewAI | LangChain Python |
| --- | --- | --- | --- |
| Factory publica y surface Python-first | Si | Si | Si |
| Tools Agent-DID con defaults seguros | Si | Si | Si |
| Inyeccion de contexto e identidad sin secretos | Si | Si | Si |
| Observabilidad estructurada saneada | Si | Si | Si |
| Cobertura avanzada de host sobre runtime real | Si | Parcial | Si |
| Extra opcional para runtime real | Si (`.[runtime]` con `semantic-kernel`) | Si (`.[runtime]` con `crewai`) | No aplica como gap principal porque el runtime real ya forma parte del stack esperado |
| Smoke test automatizado contra runtime real | Si (`semantic-kernel`) | Si (`crewai`) | Parcialmente cubierto por su stack principal y recipes, pero con una estrategia distinta |
| Ejemplos base de uso | Si | Si | Si |
| Recipes operativas mas profundas | Si | Parcial | Si |
| Observabilidad con backend especializado | Si (OpenTelemetry) | Parcial | Si (LangSmith) |
| CI dedicada, lint, type-check, tests y build | Si | Si | Si |
| Artefacto explicito de madurez/paridad | Si | Si | Parcialmente distribuido en checklist, design y parity docs |

---

## Lectura Correcta De La Matriz

### Donde Semantic Kernel ya tiene paridad real

- la integracion ya no es scaffold
- el surface publico es funcional y consistente con el resto del repositorio
- la postura de seguridad y saneamiento de observabilidad ya es comparable
- ahora existe validacion automatizada contra un runtime real de Semantic Kernel via `semantic-kernel`

### Donde Semantic Kernel ya alcanzo paridad operativa total con LangChain Python

- la validacion real de runtime ya no se limita a plugin registration y una invocacion aislada
- existe cobertura automatizada de una secuencia multi-tool con firma, verificacion, rotacion e historial sobre host real
- la integracion ahora tiene adaptador especializado de observabilidad con OpenTelemetry y pruebas automatizadas de redaccion
- el paquete ya ofrece recipes comparables de runtime, observabilidad compuesta y operacion de produccion sin corrida LLM obligatoria

---

## Conclusión

La descripcion correcta del estado actual es:

- Semantic Kernel tiene paridad funcional con CrewAI y LangChain Python para la capa base de Agent-DID
- Semantic Kernel supera a CrewAI en profundidad validada de host para F2-04 porque ya cubre una secuencia multi-step contra `semantic-kernel`
- Semantic Kernel ya puede declararse equivalente a LangChain Python en madurez operativa para el alcance actual de runtime, observabilidad y recipes del repositorio

## Gate Para Declarar Paridad Total Con LangChain Python

La claim de "paridad total" ya esta cerrada porque existen simultaneamente estos minimos:

- coverage automatizado de host avanzado mas alla del smoke base
- observabilidad especializada con evidencia automatizada de redaccion y mapping
- recipes operativas de produccion comparables a las de LangChain Python
- cierre simultaneo de esa conclusion en matriz, maturity-gap, checklist de implementacion, checklist de review y README

La claim correcta pasa a ser:

- paridad total con LangChain Python para el alcance gobernado por F2-04
- ninguna divergencia material abierta en runtime, observabilidad o recipes
