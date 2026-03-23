# Agent-DID — Filosofía Conceptual

**Tipo de documento:** Fundamento filosófico y visión  
**Versión:** 1.0  
**Fecha:** 2026-03-22

---

## El Problema de Fondo

La inteligencia artificial está dejando de ser una herramienta que los humanos usan para convertirse en un actor que toma decisiones, negocia, ejecuta código, firma operaciones y delega tareas a otros agentes. Esta transición plantea una pregunta que la industria ha ignorado sistemáticamente:

> **¿Cómo sabe un sistema quién es el agente que le está hablando?**

No quién lo creó. No en qué plataforma corre. Sino *quién es ese agente específico*, en este momento, con este comportamiento, ejecutando estas acciones.

OAuth delega esta pregunta a un proveedor centralizado. MCP la ignora por diseño. Los sistemas federados la resuelven para humanos, no para máquinas autónomas. El resultado es una arquitectura de confianza que se quiebra exactamente en el momento en que los agentes empiezan a actuar de forma autónoma y a escala.

Agent-DID existe para responder esa pregunta.

---

## Los Cinco Principios

### 1. La identidad es ciudadana de primera clase del stack de IA

La identidad de un agente no es una credencial que se agrega al final. Es la base sobre la que se construye la confianza entre sistemas autónomos. Sin identidad criptográficamente verificable, no hay auditoría real, no hay responsabilidad algorítmica, no hay sistema de revocación que funcione cuando algo sale mal.

Agent-DID trata la identidad como un componente estructural del agente — tan fundamental como el modelo que lo impulsa o el prompt que lo guía.

### 2. Flexible por diseño, no por accidente

No todos los sistemas necesitan blockchain. No todos los sistemas pueden evitarla. La filosofía de Agent-DID rechaza la imposición de un único mecanismo de anclaje de confianza:

- Un agente en un entorno de alta frecuencia financiera necesita inmutabilidad en EVM y trazabilidad criptográfica on-chain.
- Un agente en una plataforma de prototipado rápido necesita cero fricción, sin gas fees, sin wallets.
- Un agente en un entorno regulado necesita credenciales verificables compatibles con marcos de cumplimiento.

El mismo estándar — el mismo SDK — debe funcionar en los tres casos. El desarrollador elige su mecanismo de anclaje según sus necesidades reales, no según las limitaciones de la herramienta.

### 3. Encontrar al desarrollador donde está

Un estándar que requiere aprender un nuevo paradigma antes de escribir la primera línea de código útil tiene un problema de adopción estructural. Agent-DID se integra en los frameworks que los desarrolladores ya usan — LangChain, CrewAI, Semantic Kernel, Microsoft Agent Framework — y les da identidad verificable sin exigirles que abandonen su flujo de trabajo.

La abstracción hace el trabajo pesado. El desarrollador obtiene el beneficio.

### 4. Estándares abiertos sobre lock-in propietario

Agent-DID está construido sobre W3C DID Core y el modelo de datos de Credenciales Verificables. No define un nuevo formato de identidad — extiende el estándar que la industria ya está convergiendo, añadiendo los metadatos específicos que los agentes de IA necesitan: hash del modelo base, hash del system prompt, capacidades declaradas, ciclo de vida de evolución.

Esta elección no es filosófica por conveniencia — es filosófica por convicción. Un ecosistema de identidad para agentes de IA solo tiene valor si es interoperable. Un estándar propietario no es un estándar: es una dependencia.

### 5. Verificabilidad sin complejidad accidental

La criptografía de identidad es compleja. Los desarrolladores de agentes no deberían tener que serlo. La brecha entre "esto es criptográficamente correcto" y "esto es usable en producción" es donde la mayoría de los proyectos de identidad descentralizada fracasan.

Agent-DID cierra esa brecha con dos mecanismos:
- **Abstracciones de framework** que inyectan identidad en la cadena de ejecución del agente sin código adicional del desarrollador.
- **Ed25519 por defecto** — la primitiva criptográfica más rápida, más compacta y más segura para entornos de firma de alta frecuencia, sin opciones que confundan ni parámetros que mal-configurar.

---

## La Visión

La Web Agéntica — el ecosistema donde los agentes de IA actúan, negocian y colaboran a escala de internet — necesita una capa de identidad que sea a los agentes lo que HTTPS fue a los navegadores: invisible cuando funciona, crítica cuando falla.

Agent-DID aspira a ser esa capa. No el único protocolo, sino el estándar de referencia que demuestra que identidad verificable para agentes es posible, asequible y compatible con los frameworks que ya existen.

El proyecto no compite con ANP, A2A o MCP. Complementa su ecosistema con la pieza que todos asumen pero ninguno provee: **la prueba criptográfica de quién eres cuando eres un agente autónomo**.

---

## Relación con el Ecosistema

| Protocolo / Estándar | Rol | Relación con Agent-DID |
|---|---|---|
| **W3C DID Core** | Formato de identidad descentralizada | Fundación — Agent-DID lo extiende |
| **W3C Verifiable Credentials** | Credenciales verificables | Adoptado para certificaciones de compliance |
| **did:wba (ANP)** | Anclaje web sin blockchain | Método soportado — complementario |
| **did:ethr / did:key** | Métodos DID estándar | Resolubles via `UniversalResolverClient` |
| **MCP (Anthropic)** | Integración de herramientas para LLMs | Agent-DID provee la capa de identidad que MCP no define |
| **Google A2A** | Comunicación entre agentes | Agent-DID provee identidad verificable para actores A2A |
| **LangChain / CrewAI / SK / MAF** | Frameworks de orquestación | Integrados nativamente — Agent-DID se inyecta en su ciclo de ejecución |

---

## Lo que Agent-DID No Es

- **No es un framework de orquestación.** No reemplaza a LangChain ni a CrewAI. Se integra con ellos.
- **No es un sistema de pagos.** Aunque es compatible con ERC-4337 para wallets de agente, no gestiona pagos por sí mismo.
- **No impone blockchain.** El registro EVM es una opción, no un requisito. Los mecanismos `did:wba` o `did:web` son igualmente válidos.
- **No es una plataforma centralizada.** No hay un servidor Agent-DID al que conectarse. El protocolo es el producto.

---

*Este documento es la base conceptual del proyecto. Todos los documentos técnicos, decisiones de diseño y prioridades de roadmap deben poder derivarse de los principios aquí expresados.*
