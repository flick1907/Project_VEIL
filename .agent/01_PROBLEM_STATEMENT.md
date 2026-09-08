# Official Problem Statement

[OFFICIAL] The available SIH statement asks for a working prototype consisting of a browser extension/JavaScript client for Chrome and Firefox and a server. The client locally interprets the current screen with a lightweight vision model, dynamically detects and sanitizes sensitive visual data before any network request, transmits only anonymized context to a central LLM/VLM, and executes returned browser actions to assist an end-to-end task.

[OFFICIAL] A ViT or equivalent and WebGPU are examples, not mandated technologies. The server model may be offline-deployable open-source/open-weights, while cloud-hosted use is allowed during SIH.

# Official Requirements

- [OFFICIAL] Run local vision processing in the browser using a lightweight approach; ViT or equivalent is an example.
- [OFFICIAL] Dynamically detect and redact sensitive elements using DOM tags or another method.
- [OFFICIAL] Demonstrate face blur, password blackout, and PII masking as examples of sanitization.
- [OFFICIAL] Enforce privacy before every network request carrying visual context.
- [OFFICIAL] Transmit anonymized visual context to a central LLM/VLM.
- [OFFICIAL] Ensure the server understands the redaction scheme sufficiently to process sanitized context.
- [OFFICIAL] Return processed data or browser UI actions from the server.
- [OFFICIAL] Demonstrate an end-to-end user-assisting task.
- [OFFICIAL] Support Chrome and Firefox through an extension/JavaScript client.
- [OFFICIAL] Balance local inference latency and accuracy; client resource usage is evaluated.

# Official Evaluation Criteria

- [OFFICIAL] Accuracy of visual context from screen — 25%.
- [OFFICIAL] Recall and precision for sensitive/PII detection — 20%.
- [OFFICIAL] Precision of redaction — 20%.
- [OFFICIAL] Client-side resource utilization — 20%.
- [OFFICIAL] End-to-end latency of the provided task — 15%.

# Our Interpretation

- [INTERPRETATION] The server needs enough non-sensitive structural and visual context to reason about the task after redaction, not merely a blurred screenshot.
- [INTERPRETATION] DOM-only extraction will not reliably cover canvas content, images, faces, rendered text, misleading semantics, or arbitrary website layouts; local visual perception is therefore materially relevant.
- [INTERPRETATION] Accurate privacy handling requires both high detection recall and region-accurate redaction; either alone is insufficient.
- [PROPOSED] A hybrid client pipeline should prioritize deterministic DOM signals and use visual perception for gaps, with a privacy gate that refuses transmission when sanitization is incomplete or unverifiable.
- [PROPOSED] Browser actions should be structured proposals subject to local validation, allowlisting, freshness checks, and confirmation where risk warrants it.

# Assumptions

- [ASSUMPTION] The team will choose a narrow, repeatable browser task and its fixtures because the statement does not prescribe one.
- [ASSUMPTION] The team will define a demonstrable sensitive-data taxonomy and evaluation protocol because neither is specified.
- [ASSUMPTION] A mixed representation of redacted visual regions and safe structural metadata may be more useful than an image alone; the statement does not dictate payload form.

# Ambiguities / Open Questions

- [CONFIRMED] SIH problem ID: 26171. Organization: Indian Space Research Organization (ISRO).
- [TBD] The required demo task, datasets, test pages, hardware baseline, browser versions, and target latency are unspecified.
- [TBD] The complete PII taxonomy, acceptable detection/redaction thresholds, retention policy, consent model, and action permission model are unspecified.
- [TBD] The payload format, coordinate system, browser-extension policy constraints, and definition of “accuracy of visual context” are unspecified.
- [TBD] The statement does not say that a particular model, WebGPU, ONNX Runtime Web, Transformers.js, offline server, or autonomous clicking policy is mandatory.
