# Privacy and Security Design

## Scope and security posture

[CONFIRMED] SIH requires local detection and sanitization of sensitive visual context before every network request carrying that context. Only anonymized visual context may be sent to the central LLM/VLM.

[PROPOSED] VEIL is designed to prevent accidental transmission of raw capture data and to fail closed when a required privacy or action-safety control is unavailable. It does not claim that an extension can protect data from a compromised device, compromised browser process, or a perfect failure-free sensitive-data detector.

## Assets

- Raw screenshots, screenshots crops, canvas pixels, and rendered viewport state.
- Raw DOM text, input values, hidden DOM content, attributes, accessibility labels, and local browser context.
- Local OCR output, text-region boxes, face boxes, masks, detector confidences, and model inputs/intermediate tensors.
- Sanitized images/regions, safe structural metadata, redaction-map semantics, protocol versions, and session/request identifiers.
- Extension permissions, active session state, API destination configuration, action capabilities, audit events, and user confirmations.
- Server prompts/context, server responses, action proposals, server logs, and any retained request data.

## Sensitive data classification

### Directly sensitive

- Passwords, credentials, tokens, secrets, authentication flows, and input values.
- Identifiers and contact details within the agreed PII taxonomy.
- Faces and other identifying visual content.
- Raw screenshots, full DOM/HTML, raw OCR text, browsing history, and original visual crops because they may contain undiscovered sensitive data.

### Sensitive metadata

- Fine-grained coordinates, element labels, page URLs/origins, session identifiers, redaction categories, and action audit data can reveal behavior or identity when combined. Minimize and retain only what the demo requires.

### Non-sensitive only by policy

[PROPOSED] A field is network-eligible only after the privacy gate classifies it as necessary and safe under the current payload schema. No page-derived value is safe merely because it comes from DOM, OCR, or a model.

## Threat actors

- **Malicious webpage:** manipulates DOM, hidden content, canvas, overlays, timing, messages, or prompt-injection text to cause data exposure or unsafe actions.
- **Curious/compromised server or operator:** attempts to retain, infer, request, or misuse data beyond the sanitized contract.
- **Network attacker:** attempts interception or modification of requests/responses in transit.
- **Malicious extension/page-adjacent script:** attempts to exploit overly broad permissions, unvalidated message passing, storage, or transport paths.
- **Accidental developer error:** serializes a raw screenshot, raw OCR string, full DOM object, debug log, or unsafe action path.
- **Authorized user mistake:** starts a session on an unintended page or approves a high-impact action without understanding its effect.
- **Out of scope but acknowledged:** a compromised endpoint, browser process, or malicious local user with full device access can access in-memory data. Extension architecture cannot provide a meaningful confidentiality guarantee in that case.

## Trust boundaries

1. **Webpage ↔ extension page-facing code:** untrusted DOM, rendered pixels, and page messages enter local processing. They are data, never authority.
2. **Extension page-facing code ↔ privileged extension components:** typed, schema-validated messages bound to the active authorized tab, origin, and session.
3. **Raw local processing ↔ sanitized-context builder:** raw capture/OCR/DOM objects are local-only. Only redaction outputs and allowlisted safe metadata can cross through a narrow internal interface.
4. **Privacy gate ↔ network transport:** only a freshly serialized, schema-valid `SanitizedContext` may enter transport.
5. **Client ↔ server:** the server receives sanitized context only. Server outputs are untrusted proposals requiring local validation.
6. **Action proposal ↔ live browser:** local policy, target freshness, geometry, origin/state checks, and user confirmation decide whether an action occurs.

## Attack surfaces

### Screenshots, canvas, and model inputs

Raw visual capture may contain all visible sensitive data. Canvas/image/video content can bypass DOM semantics. Model input buffers, GPU tensors, and worker data are sensitive local ephemeral assets and must not be persisted or reused across sessions.

### DOM text, hidden elements, shadow DOM, and iframes

DOM content can contain secrets not visible to the user, deceptive labels, attacker-controlled strings, or values outside the allowed task. Hidden elements must not be included merely because they are present. Open shadow roots may be evaluated locally; closed roots, canvas-only controls, and cross-origin frames must be treated as visual fallback or unsupported cases. The architecture does not attempt to bypass browser origin isolation.

### OCR and visual detection output

OCR output can itself contain PII. Confidence, boxes, and categories can be sensitive metadata. OCR must run locally, output must stay local unless transformed into an explicitly permitted safe structural field, and failure must not downgrade a region to safe.

### Extension permissions, messages, cache, and logs

Overbroad host/capture permissions expand the blast radius. Page-facing messages may be forged or malformed. Storage, debug logging, crash reporting, and caches can leak raw data after an otherwise correct redaction flow. The prototype should use least privilege, typed message validation, session-bound state, metadata-only logs, and zero persistence of raw captures/OCR.

### API requests and server storage

Unexpected request construction, extra JSON keys, base64 blobs, raw strings, redirects, incorrect endpoints, or verbose server logs can exfiltrate data. The server may try to request unavailable raw content. Restrict destinations, use encrypted transport, enforce the serialized allowlist at the client, reject unsupported server requests, and set retention to the minimum needed for the demo. Exact retention policy is [TBD].

### Model and action outputs

Model output can contain indirect prompt injection, false task interpretation, malicious action payloads, or attempts to request arbitrary scripts/data. Only typed outputs are accepted; webpage text is framed as untrusted data; no response can expand capabilities, execute code, or bypass confirmation.

## Privacy invariants and enforcement

### INV-001 — Raw capture is not transport-eligible

- **Invariant:** Raw screenshots, original crops, canvas blobs, raw OCR text, input values, full DOM/HTML, and capture handles cannot be passed to the visual-context transport API.
- **Why enforceable:** Transport accepts only a fresh serialized `SanitizedContext`, not caller-supplied objects or raw visual types.
- **Enforcement:** module capability separation; a private builder; allowlisted fields/types; unknown-key stripping; prohibited-field/type checks; direct-transport rejection tests; request inspection on fixtures.

### INV-002 — A visual-context request requires gate verification

- **Invariant:** A visual-context request is emitted only after a privacy-gate decision for the same capture/session and redaction-policy version.
- **Why enforceable:** The transport requires a gate-issued payload/evidence object and rejects absent, stale, mismatched, or invalid evidence.
- **Enforcement:** capture/session identifiers, schema validation, redaction-map validation, freshness checks, destination allowlisting, and fail-closed errors.

### INV-003 — Detection uncertainty never authorizes disclosure

- **Invariant:** A low-confidence, conflicting, failed, or unavailable detector result cannot classify its underlying visual region as safe for transmission.
- **Why enforceable:** The policy engine has only conservative actions for uncertainty: expand/cover a mask, omit the region, request user resolution, or cancel the request.
- **Enforcement:** category policy, confidence bands, detector provenance, union masks, and labelled negative tests. Threshold values are [REQUIRES BENCHMARK].

### INV-004 — Logs and storage do not persist raw sensitive artifacts

- **Invariant:** The extension’s normal audit/caching path stores neither raw captures, raw OCR output, full DOM/HTML, nor raw sensitive values.
- **Why enforceable:** Audit schema accepts metadata-only events and storage wrappers reject prohibited types/fields.
- **Enforcement:** narrow log schema, session-end cleanup, retention tests, debug logging review, and storage inspection during fixture runs.

### INV-005 — Server output has no direct browser authority

- **Invariant:** A server/LLM/VLM response cannot execute arbitrary JavaScript or perform a high-impact action without client policy and, where required, just-in-time user confirmation.
- **Why enforceable:** The client parses a small typed action schema and independently validates it against the live page.
- **Enforcement:** action allowlist, schema parser, origin/state/target/geometry/expiry checks, confirmation tokens, and audit events.

### What is not an invariant

[PROPOSED] “No sensitive fact can ever reach the server” is not a technically enforceable invariant before implementation and evaluation because a detector can miss unknown sensitive content. VEIL can enforce that raw capture objects do not enter transport and that uncertainty fails safely; it must measure residual detection/redaction failure on defined fixtures rather than claim perfection.

## Fail-closed behavior

- **Detector crashes or model is unavailable:** do not send the dependent visual region. Apply known DOM masks, omit unverified visual regions, ask the user, or cancel.
- **Detector confidence is low or signals disagree:** use conservative union/expanded masking, reduce context, seek user resolution, or cancel. Do not lower the threshold silently.
- **OCR fails:** never send its input/output; retain only a local detected-region mask if trustworthy, otherwise omit or cover the containing region.
- **Redaction fails or coordinate validation fails:** block the request and discard the affected representation; never fall back to original pixels.
- **Screenshot capture fails:** do not fabricate visual context. Use a permitted DOM-only assistance path only if it satisfies the current task and privacy policy; otherwise report that visual assistance is unavailable.
- **Unexpected network request is attempted:** transport denies non-gate payloads and unapproved destinations; record metadata-only rejection locally.
- **Server requests unavailable data:** reject the request; the client does not expose raw screenshots, DOM, OCR, session secrets, or new capabilities.
- **Network/server timeout or response is malformed:** execute no action; show a safe retry/manual-guidance state. A retry requires new or still-valid gate-approved context.
- **Action validation fails or target is stale:** execute nothing; invalidate the proposal and request a new authorized sanitized observation if needed.

## Privacy proof for SIH judging

[PROPOSED] Demonstrate mechanisms and evidence, not an unqualified privacy guarantee.

1. **Synthetic/consented fixtures:** Use controlled pages containing known passwords, PII, faces, visual-only text, and benign lookalikes. Keep fixture ground truth outside transmitted payloads.
2. **Before/after visualization:** Show a local raw fixture only in the controlled demo, then show the redacted representation and its mask categories/geometry before request creation.
3. **Network inspection:** Capture extension/server-bound requests for the same fixture and show that they contain only the allowlisted sanitized schema—no original image, raw OCR text, password, or input value.
4. **Server-side evidence:** Show request schema validation and metadata-only logs with redacted payload identifiers; do not log demo secrets as proof.
5. **Automated negative tests:** Attempt raw screenshot, base64 image, raw OCR string, full DOM, unknown-key, stale-evidence, and direct-transport payload injection. Each must be rejected before network emission.
6. **Metric evidence:** Report labelled PII-detection precision/recall and redaction coverage/over-masking. Explain known misses and failure-safe behavior.

## Primary privacy risks

- Undetected pixel-only sensitive data in image, canvas, video, or custom UI content.
- Incorrect coordinate conversion, crop scaling, zoom, or redaction order leaving an edge of a region visible.
- A developer-created alternate network/debug path bypassing the privacy gate.
- Raw OCR/capture/log/cache persistence beyond the active session.
- Overshared DOM metadata or action/audit metadata that reveals user context.
- Prompt injection or malicious server output inducing unsafe action proposals.

## Security assumptions and limits

- [ASSUMPTION] Browser extension isolation and standard encrypted HTTPS transport operate as designed on the disclosed demo environment.
- [ASSUMPTION] The extension receives only the permissions necessary for the agreed demo, and users authorize sessions on the intended active tab.
- [TBD] Exact browser APIs, permissions, server authentication, retention period, cross-origin frame policy, and extension storage policy.
- [REQUIRES BENCHMARK] Detector confidence thresholds, mask margins, visual-fallback coverage, capture strategy, and residual privacy risk under the selected fixtures.

## Decisions still TBD

- [TBD] Final sensitive-data taxonomy, including languages/scripts and any India-specific identifier formats.
- [TBD] Server retention/deletion policy, authentication, and deployment posture for the SIH prototype.
- [TBD] Exact extension permissions, cross-origin iframe behavior, and user-facing inspection/audit UI.
- [REQUIRES BENCHMARK] Confidence thresholds, OCR/model choice, redaction margins, payload granularity, and browser resource/latency budgets.

IMPLEMENTATION STATUS

The deterministic privacy boundary has been implemented.

Verified:
- raw password-like fields rejected
- unknown fields stripped
- unsanitized transport objects rejected
- backend rejects raw password fields
- backend rejects raw email in safe text
- actual browser E2E request verified
- network payload contained zero raw sensitive fixture values

Current verified fixture:
Asha Kumar
asha@example.com
+91 9876543210
demo-secret
BOOK-26171

None of these raw sensitive values appeared in the
server-bound payload during E2E verification.

IMPORTANT LIMITATION:
This verification covers the current deterministic DOM path.
Pixel-only/canvas/image/video sensitive data is NOT yet covered
by the current implementation. That requires the visual-perception
milestone.