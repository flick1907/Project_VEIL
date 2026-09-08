# Requirements Specification

Priority definitions: **Must** is necessary for the SIH prototype; **Should** materially improves the demo or safety posture; **Could** is deferred unless time permits.

## Functional requirements

### FR-001 — Browser client

- **Requirement:** Provide an extension/JavaScript client that operates in Chrome and Firefox.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** The same core demo workflow is run in both browsers and the client performs local observation, sanitization, server communication, and assistance in each.

### FR-002 — Local screen perception

- **Requirement:** Perform lightweight visual perception locally in the browser on relevant current-screen state.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** A demo shows local processing of screen context and identifies enough non-sensitive visual structure/state to support the selected end-to-end task.

### FR-003 — Dynamic sensitive-data detection

- **Requirement:** Dynamically detect sensitive elements using DOM tags or another suitable local method.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** Test fixtures demonstrate detection of password fields, PII, and faces or equivalent visual-sensitive examples, with recorded detection recall and precision.

### FR-004 — Local redaction

- **Requirement:** Redact sensitive elements locally before visual context is transmitted.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** Demo evidence shows password blackout, PII masking, and face blur (or documented equivalent) applied on-device before the corresponding request is emitted.

### FR-005 — Sanitized-context delivery

- **Requirement:** Send anonymized visual context to a central LLM/VLM or equivalent server-side reasoning component.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** The server receives a versioned sanitized payload and can interpret the redaction scheme sufficiently to return task-relevant output.

### FR-006 — End-to-end assistance

- **Requirement:** Demonstrate a complete task in which server processing returns useful data or browser UI actions that assist the user.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** A repeatable demo begins with a user-authorized task and ends with observable assistance, with timings recorded across local processing, transfer, server processing, and response handling.

### FR-007 — Structured action handling

- **Requirement:** Represent server-suggested browser actions as structured data rather than remote executable code.
- **Source:** Proposed
- **Priority:** Should
- **Acceptance criteria:** Each action contains an allowed type, target descriptor, expected page context, and optional confirmation requirement; unparseable or unsupported actions are rejected locally.

## Non-functional requirements

### NFR-001 — Visual-context accuracy

- **Requirement:** Preserve sufficient non-sensitive screen structure/state for the chosen task after sanitization.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** A documented fixture suite measures task-relevant visual-context accuracy and reports the result with methodology.

### NFR-002 — Sensitive-data detection quality

- **Requirement:** Measure recall and precision of sensitive/PII detection.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** The evaluation records true positives, false positives, and false negatives for the defined taxonomy; thresholds remain [TBD] until benchmarking.

### NFR-003 — Redaction precision

- **Requirement:** Measure whether redaction covers the actual sensitive region while retaining useful context.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** Labeled fixtures and a documented region-overlap or equivalent method report redaction precision; acceptance threshold is [TBD].

### NFR-004 — Resource utilization

- **Requirement:** Measure client-side resource usage of local processing.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** The demo reports browser/device environment plus CPU, memory, GPU availability where observable, processing time, capture resolution, and payload size for each scenario.

### NFR-005 — Latency

- **Requirement:** Measure and manage end-to-end task latency while balancing it against accuracy.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** The system records local detection/redaction time, request size and transfer time, server reasoning time, and action handling time; target thresholds are [TBD].

### NFR-006 — Server deployment flexibility

- **Requirement:** Do not make cloud deployment mandatory when choosing the server model/deployment approach.
- **Source:** Official
- **Priority:** Should
- **Acceptance criteria:** Architecture documents cloud use as allowed during SIH and retain local/offline deployability as a decision to evaluate, not an asserted requirement.

## Privacy and security requirements

### PRIV-001 — Pre-transmission privacy enforcement

- **Requirement:** Enforce local sanitization before every network request that carries visual context.
- **Source:** Official
- **Priority:** Must
- **Acceptance criteria:** The visual-context request path requires sanitization evidence; an attempt to submit an unredacted or unverifiable visual payload is blocked and recorded locally.

### PRIV-002 — Data minimization

- **Requirement:** Construct a minimal sanitized representation containing only task-relevant visual regions and safe structural metadata.
- **Source:** Proposed
- **Priority:** Should
- **Acceptance criteria:** The payload contract documents every field, its necessity, sensitivity classification, and sanitization rule; raw screenshot and raw OCR text are excluded.

### PRIV-003 — Uncertain detection fails safely

- **Requirement:** Handle uncertain sensitive-data detection without treating uncertain content as safe.
- **Source:** Proposed
- **Priority:** Must
- **Acceptance criteria:** Configured low-confidence or conflicting detections trigger conservative masking, context reduction, user intervention, or request cancellation; the selected policy is documented and tested.

### SEC-001 — Least-privilege browser access

- **Requirement:** Request only the browser permissions required by the selected demo workflow.
- **Source:** Proposed
- **Priority:** Should
- **Acceptance criteria:** The extension manifest and documentation identify each permission, its purpose, and its necessity; unused broad host permissions are absent.

### SEC-002 — Action safety validation

- **Requirement:** Validate server-proposed actions locally before execution.
- **Source:** Proposed
- **Priority:** Must
- **Acceptance criteria:** The client enforces an action allowlist, validates the live target and expected page state, rejects stale/missing/mismatched targets, and records accepted and rejected actions.

### SEC-003 — User control and auditability

- **Requirement:** Provide visible session control and an auditable action trail.
- **Source:** Proposed
- **Priority:** Should
- **Acceptance criteria:** The user can pause/cancel assistance; every proposed action has a local audit event with outcome and reason, without persisting raw sensitive screen content.

## ML requirements

### ML-001 — Local perception scope

- **Requirement:** Use local visual perception where DOM semantics are absent, misleading, or insufficient for task context or sensitive-region discovery.
- **Source:** Interpretation
- **Priority:** Must
- **Acceptance criteria:** The selected demo includes at least one case not safely or completely addressed by DOM-only rules, and documents how local perception improves the outcome.

### ML-002 — Deterministic-first sensitive signals

- **Requirement:** Use deterministic DOM signals for known sensitive fields before or alongside visual inference.
- **Source:** Proposed
- **Priority:** Should
- **Acceptance criteria:** Password inputs and configured semantic sensitive fields are redacted through deterministic local rules; visual detection complements rather than replaces them.

### ML-003 — Model/runtime selection by evidence

- **Requirement:** Defer the exact local model and runtime until benchmarked against accuracy, latency, and client resource use.
- **Source:** Proposed
- **Priority:** Must
- **Acceptance criteria:** The decision log records evaluated candidates and comparable measurements before the implementation commits to a model/runtime.
