# AI/ML Plan

## Scope and decision discipline

[CONFIRMED] SIH requires lightweight local visual processing in the browser, local dynamic sensitive-data redaction before visual-context network transmission, server-side LLM/VLM interpretation of anonymized context, and an end-to-end assistance task.

[PROPOSED] VEIL uses a DOM-first hybrid pipeline with targeted local visual fallback. This document defines responsibilities and model-evaluation criteria; it does not select a final model, runtime, or provider.

## A. Deterministic processing

The following belongs in deterministic code because it must be auditable, low-latency, and fail closed. ML would add uncertainty without improving the security boundary.

- **DOM-based signals and HTML metadata:** inspect allowlisted input types, autocomplete hints, roles, labels, visibility, bounding rectangles, and task-relevant states. These are high-confidence signals for conventional fields, not a complete source of truth.
- **Known-format PII patterns:** evaluate selected local regular expressions and dictionaries against local DOM text or local OCR output. They are useful for structured values, but do not detect every name, face, free-text identifier, or contextual secret.
- **Sensitive-region fusion policy:** normalize detector outputs into one coordinate system, apply category rules, and take a privacy-conservative union of regions.
- **Redaction rendering:** generate masks and perform blackout, blur, or replacement deterministically. The renderer must never choose to expose a region based on a probabilistic guess.
- **Sanitized-context construction:** create a fresh allowlisted serialized payload, strip unknown fields, and reject prohibited data. This is the privacy gate, not an ML task.
- **Confidence policy:** compare scores against policy thresholds, resolve conflicts conservatively, and decide whether to mask, reduce context, ask the user, or cancel. Threshold values are [REQUIRES BENCHMARK].
- **Action schema validation and execution:** allowlist action types, verify target freshness/geometry/state, enforce confirmation, and execute bounded browser operations. No remote model output is executable code.

## B. Local ML

Local ML is justified only where DOM and deterministic rules cannot safely recover rendered information.

- **Face detection:** identifies faces in images, video, canvas, or visually rendered content so the client can apply local blur/cover.
- **Visual text detection and optional OCR:** identifies text regions and, if needed, recognizes locally rendered text that is absent from usable DOM semantics.
- **Visual UI/region understanding:** grounds task-relevant visual regions or detects a visual-only/custom control when DOM evidence is missing or contradictory.
- **Screenshot-state understanding:** a narrow local classifier or region model may determine whether visual fallback is needed; a general on-device VLM is not assumed.

[PROPOSED] Local ML outputs geometry, category, confidence, and source provenance—not raw sensitive values. Raw OCR text is local-only detector input and never a permitted transport field.

## C. Server-side AI

[CONFIRMED] The server interprets anonymized context using a central LLM/VLM and may return processed data or browser UI actions.

[PROPOSED] Server AI owns task reasoning: interpret the selected task state, explain next steps, and propose a typed action within the capabilities supplied by the client. It does not own privacy classification, redaction, browser permissions, confirmation, or final action validation. Webpage-derived content is untrusted data, not instructions.

## Processing assignment by capability

### DOM-based signals and HTML metadata

[PROPOSED] Deterministic and local. Inputs are allowlisted DOM properties; output is a local sensitive candidate and a safe structural summary. This is fast, explainable, and effective for standard fields, but must be complemented when rendered content is not represented truthfully in DOM.

### OCR and visual text detection

[PROPOSED] Local ML fallback. Text detection proposes regions; OCR may produce local-only text for pattern matching or task context extraction. Recognition is more expensive and privacy-sensitive than locating text, so it should run only when a selected fixture/task needs it.

### PII detection

[PROPOSED] Layered local processing. DOM semantics and patterns are deterministic layers; OCR-derived text and visual regions feed local ML-assisted layers; the fusion policy is deterministic. This separation preserves auditability while covering pixel-only content.

### Face detection

[PROPOSED] Local ML. A face is often not semantically visible in DOM and must be found in pixels to support the named face-blur demonstration.

### UI element detection/grounding

[PROPOSED] DOM-first and deterministic when a live element can be resolved. Local visual grounding is a fallback for canvas/image/custom controls or layout ambiguity. Server output never bypasses local live-element validation.

### Screenshot understanding

[PROPOSED] Local perception performs only the narrow visual functions necessary to construct a safe payload. Broader task reasoning belongs on the server over sanitized context because the statement explicitly allows a central LLM/VLM.

### Redaction and sanitized-context construction

[PROPOSED] Deterministic and local. The resulting payload may contain redacted visual regions plus allowlisted safe metadata; it never contains original screenshots, raw OCR text, full DOM/HTML, input values, or raw capture handles.

### Server-side task reasoning and action generation

[CONFIRMED] Server reasoning may return processed data or browser actions. [PROPOSED] It returns guidance or a typed action proposal only. Client-side allowlisting, freshness checks, and confirmation remain the final authority.

## Local ML task cards

### Face detection

- **Input:** Ephemeral local screenshot or cropped visual region from the active authorized tab.
- **Output:** One or more viewport-relative face boxes or masks, confidence, and detector provenance.
- **Purpose:** Enable local face blur/cover before context construction.
- **Latency sensitivity:** High; it runs in the user’s interaction path, but may be limited to requested captures or image-heavy regions.
- **Memory sensitivity:** Medium; model weights and image tensors must be bounded and discarded on session end.
- **Browser/runtime requirements:** A browser-compatible inference path with GPU acceleration where available and a safe CPU/WASM fallback or feature-unavailable behavior.
- **Accuracy requirement:** High recall is privacy-critical; masks need a safety margin because exact face contours are not required for useful redaction.
- **Failure behavior:** If face detection is unavailable, fails, or is uncertain in an image-containing region, conservatively cover the candidate image/region, reduce context, ask the user, or cancel the request.

**Candidate families — no selection yet**

- [REQUIRES BENCHMARK] Lightweight single-stage face detectors and face-landmark/face-detector task models: usually small compared with general object detectors; likely browser-feasible with WebGPU or WASM; assess cold-start size, warm latency, missed-profile-face rate, and license/model-card terms.
- [REQUIRES BENCHMARK] Small general object detectors with a face class: may offer flexible geometry but are typically more costly and less purpose-built; benchmark only if the selected demo requires it.
- [TBD] A detector with segmentation-style masks may improve redaction boundaries but could be unnecessary versus expanded bounding-box blur for an SIH prototype.

### Visual text detection

- **Input:** Ephemeral local screenshot or visual crop selected after DOM-first inspection.
- **Output:** Text-region quadrilaterals/boxes, confidence, and orientation when available.
- **Purpose:** Find rendered text in images, canvas, or semantically unreliable UI before any OCR or broad region mask.
- **Latency sensitivity:** High; should not be a per-mutation full-page loop.
- **Memory sensitivity:** Medium; images and detector buffers must remain session-scoped.
- **Browser/runtime requirements:** Browser-compatible tensor runtime; support for resize/normalization and viewport-coordinate conversion.
- **Accuracy requirement:** Favor recall with box expansion for privacy; excess masking is acceptable only if the selected task remains understandable.
- **Failure behavior:** If text may exist but no trustworthy detector result is available, mask the containing visual region or omit it from sanitized context.

**Candidate families — no selection yet**

- [REQUIRES BENCHMARK] Lightweight scene-text detectors derived from segmentation or single-shot detection families: assess small-font recall, rotated text, web-font/rendering variation, box precision, weight size, and WebGPU/WASM latency.
- [REQUIRES BENCHMARK] OCR engines that include layout/text detection: convenient but may be too heavy for an extension interaction path; compare against region-only detection plus deterministic DOM fallback.
- [TBD] Fine-tuning is not assumed. It is justified only if a fixed, consented test set shows material failure on the chosen demo’s visual content and licensing permits it.

### OCR / local visual text recognition

- **Input:** Locally detected text crop, language/character-set policy, and a session-only recognition request.
- **Output:** Local text string, character/word boxes where available, and confidence.
- **Purpose:** Run local structured-PII patterns on pixel-only text, and optionally provide a minimized non-sensitive structural summary.
- **Latency sensitivity:** Very high; recognition can dominate the end-to-end path.
- **Memory sensitivity:** High relative to DOM rules because language data, weights, workers, and crop buffers can be large.
- **Browser/runtime requirements:** A worker-capable browser execution path; WASM is a candidate, while WebGPU feasibility depends on the chosen model family. Avoid remote OCR because it would violate the local sanitization boundary.
- **Accuracy requirement:** Sufficient word/box recall for conservative masking; exact transcription is not required to blackout a detected text region.
- **Failure behavior:** Never send OCR input or output remotely. On failure, use detected region geometry, mask the containing region, or omit it.

**Candidate families — no selection yet**

- [REQUIRES BENCHMARK] Traditional OCR engines compiled to browser WASM, including Tesseract-style pipelines: established for printed text and browser-worker execution, but assess cold start, language data size, worker cleanup, small UI-font accuracy, and total capture-to-mask latency. Tesseract’s core code is Apache-2.0, but all bundled model/runtime licenses must be verified at selection time.
- [REQUIRES BENCHMARK] Compact neural OCR recognizers with CTC-style decoding: potentially smaller/faster for a constrained font/language set, but require browser-compatible conversion, accuracy evaluation, and license review.
- [TBD] Multi-language or India-specific script coverage. The official statement defines no language or regional PII taxonomy; choose only what the agreed demo and evaluation fixtures require.

### Visual UI grounding / screenshot-state classification

- **Input:** Sanitization-safe local visual representation or raw local capture used only before the gate, plus DOM evidence and a narrow task label.
- **Output:** Region candidate, visual state label, fallback-needed signal, and confidence.
- **Purpose:** Address canvas/custom controls, visual overlap, image-rendered controls, and DOM/visual disagreement.
- **Latency sensitivity:** High; invoke only after explicit triggers rather than continuously.
- **Memory sensitivity:** Medium to high, depending on encoder size.
- **Browser/runtime requirements:** A lightweight browser-compatible model; coordinates must be reconciled with CSS pixels, device scale, and zoom.
- **Accuracy requirement:** False grounding must not trigger unsafe action; visual output is advisory until local DOM/geometry revalidation succeeds.
- **Failure behavior:** No action occurs from visual grounding alone. Offer guidance, request a new capture, or mark the situation unsupported.

**Candidate families — no selection yet**

- [REQUIRES BENCHMARK] Compact detection/classification models trained for a small controlled UI taxonomy: potentially feasible if the demo scope is narrow; require labelled fixtures and conversion/runtime testing.
- [TBD] General desktop/web UI grounding models or compact vision transformers: may improve flexibility but can be too large, data-hungry, or latency-heavy for the browser MVP. Do not select without measured advantage over DOM-first rules.

## Model-family assessment criteria

[PROPOSED] Every candidate must be assessed on the actual target browsers and disclosed device baseline for:

- downloadable weight and runtime size, cold start, warm latency, peak memory, CPU/GPU use, and cancellation/cleanup behavior;
- WebGPU availability and fallback behavior; a WebGPU-capable runtime is useful but not an official requirement;
- WASM/browser-worker compatibility, including interruption/restart behavior;
- relevant detection/recognition accuracy and calibration on labelled local fixtures;
- INT8, FP16, or other quantization availability, accuracy loss, and conversion reproducibility;
- whether off-the-shelf weights suffice, whether fine-tuning is necessary, and the provenance/consent of any training data;
- model, runtime, and distribution licenses, notices, and redistribution constraints.

## Layered local PII-detection strategy

### Layers

1. **DOM semantics:** redact local password fields and configured semantic sensitive elements before visual processing where possible.
2. **Deterministic local patterns:** inspect local DOM/OCR strings for the agreed structured taxonomy; patterns are versioned and fixture-tested.
3. **Visual text detection:** locate pixel-only text before recognition; use geometry to mask even if recognition is incomplete.
4. **Local OCR:** recognize only needed crops and retain output locally for pattern/context analysis.
5. **Face detection:** find faces for local blur/cover.
6. **Visual/semantic fusion:** normalize candidates into viewport coordinates, preserve source/confidence, and apply a category-specific conservative union mask.

### False positives, false negatives, and disagreement

- **False positives:** A version number, task label, or non-sensitive image could be masked. This can reduce visual-context accuracy and task completion; measure it explicitly rather than weakening privacy rules silently.
- **False negatives:** A missed small text string, misleading DOM label, canvas-rendered credential, face, or contextual identifier can leak. This is the higher privacy risk.
- **Agreement:** Multiple independent signals raise confidence; use the union of their geometry for sensitive categories.
- **Disagreement:** A deterministic password signal always masks. A visual-sensitive signal with low confidence does not make its region safe; policy may expand the mask, mask the containing region, reduce context, ask the user, or cancel. Exact thresholds are [REQUIRES BENCHMARK].

## Redaction design

### Representation and coordinates

[PROPOSED] Every candidate contains: category, source, confidence band, viewport-relative box or polygon, capture identifier, coordinate-system version, and optional safe transform request. All geometry converts to a documented viewport-pixel space with CSS-pixel/device-scale/zoom metadata. Redaction occurs on the exact visual representation being sent, after coordinate validation.

### Masks and transformations

- **Credentials and high-risk text:** opaque blackout with an expanded margin; do not rely on reversible blur.
- **Structured PII text:** opaque masking in the image plus omission/tokenization from any safe structural metadata.
- **Faces:** blur with an expanded region or opaque cover. The selected transformation must be judged on residual recognizability, not aesthetics alone.
- **Partially detected text/face:** expand to line, container, crop, or image region according to the fail-safe policy. Never send the unmasked remainder merely because the detector found only part.
- **Useful context preservation:** retain non-sensitive layout, role/state summaries, redaction geometry/categories, and selected non-sensitive regions. The server must treat redacted areas as unknown and never request their recovery.

## Server-side AI representation options

### A. Sanitized screenshot

- **Visual-context accuracy:** High for layout, visual state, and canvas/image content after masking.
- **Privacy:** Residual risk remains if detection/redaction missed something; send only after local gate verification.
- **Latency and size:** Potentially highest due to image encoding and VLM input.
- **Reasoning quality:** Good for visual tasks; weak for precise element semantics unless paired with metadata.

### B. Structured DOM summary

- **Visual-context accuracy:** Good for conventional semantic UI; weak for rendered-only information.
- **Privacy:** Easier to minimize, but raw strings/attributes are still sensitive and must be allowlisted.
- **Latency and size:** Usually low.
- **Reasoning quality:** Good for form structure; poor for faces, images, canvas, layout occlusion, and deceptive semantics.

### C. OCR plus bounding boxes

- **Visual-context accuracy:** Captures text and rough layout but loses non-text visuals and can inherit OCR errors.
- **Privacy:** OCR text is highly sensitive; it cannot leave unless independently sanitized/tokenized.
- **Latency and size:** OCR adds local cost; sanitized geometry/text summaries can be compact.
- **Reasoning quality:** Good only for text-centric tasks with strong local sanitization.

### D. Hybrid sanitized visual plus structural representation

- **Visual-context accuracy:** Best prospective coverage: redacted visual layout plus allowlisted role/state/geometry.
- **Privacy:** More fields demand strict minimization and schema enforcement, but local redaction and provenance remain explicit.
- **Latency and size:** Adjustable through regional images and compact metadata; must be benchmarked.
- **Reasoning quality:** Best prospective grounding for the selected task because the server has visual and structural cues without raw values.

[PROPOSED] Evaluate the hybrid representation first because it matches the architecture, but retain screenshot-only or structure-only variants as ablations. Final server model and representation choice are [REQUIRES BENCHMARK].

## Evaluation mapped to SIH metrics

### Visual-context accuracy — 25%

- **Measure:** task-relevant screen-state/region interpretation after redaction, plus server task-success rate on fixtures.
- **Test cases:** conventional DOM forms, images/faces, canvas/custom UI where included, visual overlays, zoom/device-scale variants, and redacted/non-redacted context variants.
- **Method:** compare expected task-relevant labels/grounding with local and server outputs; report failures by page type and sanitization state.
- **Variables:** representation type, crop/resolution, DOM coverage, visual fallback trigger, mask size, server reasoning approach.

### Sensitive/PII detection precision and recall — 20%

- **Measure:** region- and category-level true positives, false positives, and false negatives for the agreed taxonomy.
- **Test cases:** passwords, faces, structured PII, pixel-only text, small/rotated text, deceptive/missing DOM metadata, and benign lookalikes.
- **Method:** use labelled synthetic or consented fixtures; compute category-level precision/recall and inspect misses qualitatively.
- **Variables:** DOM rules, pattern set, OCR/detector model, confidence thresholds, fusion/mask expansion policy.

### Redaction precision — 20%

- **Measure:** whether the sent visual representation fully covers sensitive ground-truth regions while retaining required non-sensitive task context.
- **Test cases:** adjacent text, partial faces, overlapping UI, high-DPI/zoom, image/canvas text, and dynamic page updates.
- **Method:** compare ground-truth regions with final transmitted masks using an agreed overlap/coverage method; separately record residual visible sensitive pixels and over-masking.
- **Variables:** coordinate conversion, mask margin, blur/blackout method, detector geometry, crop/scale, rendering order.

### Client-side resource utilization — 20%

- **Measure:** cold start, warm latency, peak and steady memory, CPU/GPU use where observable, model/runtime size, capture size, and worker cleanup.
- **Test cases:** supported Chrome and Firefox versions on the disclosed hardware baseline, repeated sessions, dynamic pages, WebGPU available/unavailable paths.
- **Method:** instrument each pipeline stage and report distributions rather than a single best run.
- **Variables:** model family, quantization, runtime, OCR language data, image resolution, crop strategy, trigger cadence, caching policy.

### End-to-end latency — 15%

- **Measure:** user authorization to result/action proposal, with local observation, local detection/redaction, privacy-gate serialization, transfer, server reasoning, local validation, and confirmation shown separately.
- **Test cases:** normal DOM-fast path, visual-fallback path, server timeout, page mutation/stale action, and each supported browser.
- **Method:** timestamp stages with correlated session/request identifiers that contain no raw user data.
- **Variables:** local model/runtime, capture size, network conditions, payload representation, server model, retry policy, action validation.

## Recommended ML pipeline

[PROPOSED] Start with deterministic local DOM and policy layers, invoke local face/text/visual models only for the selected visual fallback cases, render and verify redaction locally, send a minimal hybrid sanitized context, and keep server AI limited to task reasoning plus typed action proposals. Local privacy enforcement and action validation remain deterministic.

## Components that should not use ML

- Privacy-gate serialization, outbound allowlisting, and prohibited-field checks.
- Password-field recognition from explicit DOM semantics.
- Redaction rendering and coordinate conversion.
- Consent, session state, action allowlisting, target freshness, and user confirmation.
- Audit metadata, timeout handling, and evaluation instrumentation.

## Most important model-selection benchmarks

- Face and text-region recall/precision on the chosen visual fixtures, especially misses that would cause disclosure.
- End-to-end local capture-to-redaction latency and peak memory in Chrome and Firefox.
- Cold-start/download footprint and worker lifecycle recovery.
- Browser WebGPU versus WASM/CPU fallback behavior on the disclosed hardware.
- Mask coverage versus over-masking after coordinate conversion at zoom and high-DPI settings.
- Hybrid sanitized-context task success versus screenshot-only and structure-only ablations.

## Biggest ML risks

- A lightweight browser model misses pixel-only sensitive information or yields imprecise boxes.
- OCR dominates latency/memory or produces unsafe recognition errors on UI-sized text.
- A visual fallback trigger is too eager, harming resources, or too narrow, missing relevant content.
- A model/runtime has incompatible browser behavior, weight size, license, or redistribution constraints.

## Decisions still TBD

- [TBD] Demo workflow, sensitive-data taxonomy, languages/scripts, fixture set, server model, and final payload representation.
- [REQUIRES BENCHMARK] Local model families/runtimes, quantization, capture resolution/cropping, fallback triggers, confidence thresholds, mask margins, and OCR viability.

## Information required before final model selection

- Agreed demo task and success definition.
- Labelled, consented or synthetic fixtures with passwords, PII, faces, visual-only content, and benign controls.
- Chrome/Firefox versions, minimum hardware baseline, and availability of GPU/WebGPU on the demo device.
- Allowed extension permissions and capture constraints.
- Candidate model/runtime license, model-card, weight-size, and browser-distribution details.

CURRENT STATUS

No ML/vision model is implemented yet.

The deterministic DOM/privacy pipeline is complete and serves
as the baseline for the visual-perception milestone.

Next ML milestone:
- local visual text-region detection
- face detection
- visual-only sensitive-region detection
- optional local OCR
- geometry/confidence/provenance
- integration with existing redaction pipeline

Model/runtime selection remains benchmark-driven.