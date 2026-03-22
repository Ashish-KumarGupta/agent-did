# F2-05 - CrewAI Maturity Gap Assessment

## Objective

Document what still separates the CrewAI integration from the maturity level already reached by the LangChain integrations, without confusing governance alignment with feature parity.

This assessment is intentionally narrower than the implementation checklist: it focuses on the remaining deltas after the package became functional.

---

## Current Position

CrewAI is already aligned with the repository standard for:

- dedicated CI
- root validation scripts
- implementation and review governance artifacts
- secure defaults for sensitive tools
- runnable example, automated tests and package build validation

That means CrewAI is no longer a scaffold. It is a functional integration with disciplined release hygiene.

What it does **not** mean is that CrewAI is already as operationally mature as LangChain.

---

## Reference Baseline

The maturity reference for this assessment is the combined LangChain integration surface already present in:

- `integrations/langchain/`
- `integrations/langchain-python/`

The comparison is made across five dimensions:

1. Observability depth
2. Runtime realism
3. Test granularity
4. Example coverage
5. Explicit maturity criteria

---

## Remaining Gaps

### P1 - Structured Observability Layer

Current state:

- CrewAI exposes sanitized `step_callback` and `task_callback` helpers.
- The payload shape is lightweight and sufficient for traceability.

Gap versus LangChain:

- No dedicated observability module with typed events.
- No fan-out composition equivalent to `compose_event_handlers(...)`.
- No JSON logger adapter.
- No LangSmith-oriented adapter or child-run projection model.
- No explicit event taxonomy equivalent to the LangChain tool lifecycle events.

Why it matters:

This is the biggest maturity gap. LangChain can already project Agent-DID activity into reusable observability backends. CrewAI currently emits sanitized callback payloads, but not a reusable observability surface.

Exit condition:

- A dedicated CrewAI observability module exists.
- Event shapes are stable and documented.
- Sanitized callback, JSON logging and optional tracing fan-out are supported.
- Automated tests cover success, failure and redaction behavior.

### P1 - Runtime Validation Against Real CrewAI

Current state:

- The integration is deliberately dependency-light.
- The example supports optional runtime imports when `crewai` is available.

Gap versus LangChain:

- CI does not validate behavior against an installed real CrewAI runtime.
- The package proves ergonomic compatibility, but not a stronger host-runtime contract under CI.

Why it matters:

The current surface is safe and practical, but it still behaves more like a strongly tested adapter than a runtime-verified host integration.

Exit condition:

- At least one CI path installs the real CrewAI runtime.
- One or more smoke tests exercise `Agent`, `Task` and `Crew` with the shipped helper bundle.
- Any intentionally unsupported host features remain explicitly documented.

### P2 - More Granular Test Topology

Current state:

- CrewAI tests cover the factory, secure defaults, rotation behavior, callback sanitization and guardrail blocking.

Gap versus LangChain:

- Tests are concentrated in two files.
- There is no separated suite for context composition, snapshot helpers, sanitization internals or observability-specific semantics.

Why it matters:

The current suite is good enough for the shipped package, but it will become harder to evolve observability, runtime wiring or output contracts without more isolated regression boundaries.

Exit condition:

- Tests are split into clearer domains such as context, snapshot, security, observability and integration wiring.
- Future changes can fail narrowly instead of through broad end-to-end assertions.

### P2 - Example And Recipe Coverage

Current state:

- CrewAI ships one runnable wiring example.

Gap versus LangChain:

- No dedicated observability example.
- No production-style recipe with environment guards.
- No example focused on structured outputs and guardrails as an operational pattern.
- No example explicitly centered on secure HTTP signing flows.

Why it matters:

Mature integrations are not only implemented; they are easy to operate and easy to copy correctly.

Exit condition:

- CrewAI ships at least a base example, observability example and production-style recipe.
- Optional advanced examples exist for structured outputs and secure HTTP signing.

### P3 - Explicit Maturity Rubric

Current state:

- CrewAI has implementation and review checklists.
- Those checklists ensure governance discipline.

Gap versus LangChain:

- CrewAI does not yet have an explicit maturity/parity matrix of its own.
- There is no single document that states which deltas remain before calling it as mature as LangChain.

Why it matters:

Without a maturity rubric, “functional” can be mistaken for “fully mature”.

Exit condition:

- This document or a successor becomes the canonical maturity rubric.
- Review artifacts refer to it when maturity claims change.

---

## Recommended Sequence

1. Add structured observability primitives for CrewAI.
2. Add a small runtime-verified CrewAI smoke path in CI.
3. Expand examples into base, observability and production-style recipes.
4. Split the test suite into more focused modules.
5. Re-evaluate the maturity claim once the gaps above are closed.

---

## Decision Rule

CrewAI can be described as “as mature as LangChain” only when:

1. It preserves the current governance and CI discipline.
2. It gains a reusable observability layer rather than callback-only traceability.
3. It is validated against a real CrewAI runtime in at least one automated path.
4. Its examples and tests reach a depth comparable to the operational guidance already available for LangChain.

Until then, the correct description is:

- functional integration
- aligned with repository governance
- not yet at LangChain-level operational maturity