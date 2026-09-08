# SIH: On-device Visual Perception for Light-weight Browser Agents

> Senior technical analysis — evidence-led reading of the supplied SIH statement

## Source boundary

This analysis treats the SIH statement reproduced in the prompt as the official source. The workspace scan found no readable statement file, so no additional official details are asserted.

## What the problem asks us to build

A working prototype: a browser extension/JavaScript client for Chrome and Firefox, plus a server. The client locally interprets the current screen with a lightweight vision model, detects and sanitizes sensitive visual data before any network request, sends only anonymized context to a central LLM/VLM, and executes returned browser actions to assist an end-to-end task.

## Official functional requirements

- Local vision processing in the browser; ViT or equivalent is an example, WebGPU is an example.
- Dynamically detect and redact sensitive elements using DOM tags or another method.
- Demonstrate sanitization such as face blur, password blackout, and PII masking.
- Transmit anonymized visual context to a central LLM/VLM.
- Server interprets the sanitized context and returns processed data or browser UI actions.
- Demonstrate an end-to-end task that assists the user.

## Official technical / non-functional requirements

- **Client:** extension/JS running in popular browsers, explicitly Chrome and Firefox.
- Local model runs in-browser; client resource usage is evaluated.
- Privacy enforcement occurs before every network request that carries visual context.
- Server must understand the redaction scheme well enough to process the sanitized context.
- Balance inference latency against accuracy.
- Server model may be offline-deployable open-source/open-weights; cloud-hosted use is allowed during SIH.

## Evaluation rubric

| Official metric | Weight | Practical implication (interpretation) |
| --- | ---: | --- |
| Accuracy of visual context from screen | 25% | Correctly recover screen structure/state needed for the task. |
| Recall and precision for sensitive/PII detection | 20% | Avoid missed sensitive data and excess false positives. |
| Precision of redaction | 20% | Mask the actual sensitive region without destroying useful context. |
| Client-side resource utilization | 20% | Demonstrate a credible browser footprint. |
| End-to-end latency of provided task | 15% | Keep local processing, transfer, server reasoning, and action response fast. |

## Architecture boundary

### Client-side

- Observe current screen state.
- Run lightweight visual perception.
- Find sensitive elements; redact locally.
- Send only anonymized context.
- Receive and execute permitted UI actions.

### Server-side

- Consume the agreed sanitized representation.
- Use an LLM/VLM to interpret task context.
- Return task result or actionable browser commands.

Cloud hosting is allowed during SIH.

### Boundary contract

Define a versioned payload: redacted image/regions, safe structural metadata, coordinate system, redaction-map semantics, and action schema. This makes privacy auditing and server interpretation testable.

## Product reasoning

| Question | Answer | Status |
| --- | --- | --- |
| Who is the user? | A browser user seeking help with complex digital workflows while limiting sharing of sensitive screen data. | Interpretation |
| Main workflow | User initiates or authorizes assistance → extension observes → local detection/redaction → sanitized context reaches server → server returns guidance/action → extension acts and shows outcome. | Interpretation |
| Hardest engineering problem | Reliable sensitive-data detection and region-accurate redaction across arbitrary web UIs, while preserving enough context for server reasoning under browser resource limits. | Interpretation |
| Privacy baseline | No identifiable visual context should cross the network; sanitization must precede the request. | Derived from official requirement |
| Action safety | Require an explicit allowlist, coordinate/element revalidation, visible user control, and audit events for automation. | Proposed hardening |

## What genuinely needs ML / AI

- Visual understanding when DOM semantics are absent, misleading, or insufficient: screen-state classification, visual element grounding, face detection, and OCR/PII discovery in pixels.
- Server reasoning over sanitized multi-step task context to decide next assistance or action.
- Potential confidence scoring / fallback selection where deterministic signals disagree.

## What should be deterministic

- Network gate: block all unredacted visual-context requests by construction.
- DOM rules for password inputs, form autocomplete hints, input types, ARIA/labels, and configured selectors.
- Pixel redaction rendering, payload minimization, encryption in transit, logging policy, action-schema validation, and browser-action execution.
- Benchmarking, consent state, and fail-closed behavior when confidence is inadequate.

## Constraints and risk posture

### Official constraints

Browser-local resources are limited; server-side pipelines otherwise create data-sharing limits. Both Chrome and Firefox are named. The local model must be lightweight enough for browser execution. Only anonymized, unidentifiable visual data may be transmitted. Latency–accuracy trade-offs are explicit.

### Privacy / security implications

Officially required: dynamic detection and local redaction before transmission. Proposed hardening: least-privilege extension permissions, no raw screenshot persistence, request interceptor/gate, short retention, TLS, adversarial test pages, and a user-visible pause/consent control. These hardening items are not stated scoring requirements.

## Likely judging questions

- How do you prove raw pixels never leave the browser?
- What recall/precision data supports PII detection?
- How accurate are redaction boundaries?
- What runs locally, on what hardware/browser, and at what resource cost?
- How does the server reason after redaction?
- What happens when detection is uncertain?
- How do you prevent unsafe or stale UI actions?
- Can the demo work on Chrome and Firefox?

## Missing / ambiguous details

No prescribed task, datasets, test protocol, hardware baseline, latency target, specific PII taxonomy, redaction acceptance threshold, consent model, action permission model, payload format, browser-extension policy, or exact definition of “accuracy of visual context” is supplied.

## Working assumptions for future planning — not requirements

We may assume only that the team will choose a demonstrable browser task and define a test protocol, because neither is supplied. We must not assume a target hardware class, a mandatory model/runtime, a fixed sensitive-data taxonomy, a permitted-action policy, a benchmark threshold, or that “sanitized” necessarily means an image rather than a mixed structural representation.

## Do not turn these into facts

| Tempting claim | Why it is not an official fact |
| --- | --- |
| A ViT, WebGPU, ONNX Runtime Web, or Transformers.js is mandatory. | The statement uses examples/equivalence language; no fixed model or runtime is mandated. |
| All server inference must be local/offline. | Cloud-hosted server models are explicitly allowed during SIH. |
| The extension may autonomously click anything. | Actions are described, but authorization, confirmation, and safety policy are unspecified. |
| DOM tags alone guarantee privacy. | The statement permits DOM tags or other methods and requires dynamic sensitive-element detection. |
| A specific benchmark score or latency target is required. | Only metric weights are specified; thresholds and methodology are absent. |
| Exact PII categories are fixed. | Examples are provided; the full taxonomy is not. |

## Proposed documentation structure — create later

A lean set of artifacts that makes the demo, threat boundary, and scoring evidence reviewable without claiming unprovided rules.

| Document | Purpose |
| --- | --- |
| `README.md` | Problem summary, scope, demo task, architecture overview, and run/demo path. |
| `docs/requirements-traceability.md` | Map each official statement and metric to planned evidence; mark interpretations separately. |
| `docs/privacy-threat-model.md` | Data-flow diagram, trusted boundary, sensitive-data taxonomy, redaction failure modes, and fail-closed policy. |
| `docs/client-architecture.md` | Extension components, local inference/redaction pipeline, resource budget, Chrome/Firefox compatibility. |
| `docs/server-contract.md` | Sanitized payload, redaction semantics, action schema, validation, and no-raw-data invariant. |
| `docs/evaluation-plan.md` | Measurement definitions for all five official metrics, fixtures, hardware/browser disclosure, and results template. |
| `docs/demo-script.md` | Repeatable end-to-end judging demo, expected output, privacy proof points, and fallback path. |
| `docs/decision-log.md` | Explicit trade-offs and assumptions, with date and rationale. |

## Evidence source

Problem statement supplied in this chat. “Official” only identifies text explicitly stated there; “Interpretation,” “Proposed idea,” and “Assumption” are intentionally non-binding.
