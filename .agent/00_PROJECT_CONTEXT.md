# Project VEIL — Context

- **Project:** Project VEIL — On-device Visual Perception for Light-weight Browser Agents
- **SIH problem ID:** 26171
- **Organization:** Indian Space Research Organization (ISRO)
- **Current phase:** Phase 2 — Project Architecture and Documentation
- **Current status:** Documentation only. No application code, model/runtime choice, dependencies, deployment, or benchmark results exist yet.

## Problem

[CONFIRMED] Build a browser extension/JavaScript client for Chrome and Firefox with a server. The client must understand the current screen locally, dynamically detect and redact sensitive visual data before visual context is sent over the network, send anonymized context to a central LLM/VLM, and use returned processed data or browser UI actions to assist an end-to-end task.

## Proposed solution

[PROPOSED] VEIL is a privacy-first browser assistant. It combines local DOM signals with local visual perception to identify screen structure and sensitive regions, constructs a minimal sanitized context package, sends that package through a fail-closed privacy gate to a reasoning server, and executes only validated, permitted browser actions with visible user control.

## Core components

- Browser extension/client: capture coordination, DOM observation, local perception, detection, redaction, privacy gate, action executor.
- Local perception pipeline: visual screen understanding, OCR/face/PII candidate detection where deterministic DOM signals are insufficient.
- Sanitized-context contract: versioned visual and structural representation plus redaction semantics.
- Server: interprets only sanitized context through LLM/VLM reasoning and returns structured assistance or action proposals.
- Safety layer: action allowlist, target freshness checks, user confirmation policy, and audit events.

## Core data flow

Screen and DOM state → local sensitive-data detection → local redaction and minimization → privacy gate → sanitized context only → server reasoning → validated action proposal → browser revalidation/confirmation → execution or safe failure.

## Critical privacy/security principle

[CONFIRMED] Sensitive visual context must be sanitized locally before network transmission. [PROPOSED] The client must fail closed: a visual-context request cannot be created or sent unless it carries sanitization evidence conforming to the agreed contract.

## Official evaluation criteria

- Accuracy of visual context from screen: 25%
- Recall and precision for sensitive/PII detection: 20%
- Precision of redaction: 20%
- Client-side resource utilization: 20%
- End-to-end latency of provided task: 15%

## Important unresolved decisions

- [TBD] Prescribed demo task, PII taxonomy, dataset, benchmark protocol, thresholds, hardware baseline, and action authorization policy.
- [REQUIRES BENCHMARK] Local model/runtime, capture cadence and resolution, redaction method trade-offs, payload representation, and confidence thresholds.
- [TBD] Exact server deployment and LLM/VLM choice; cloud-hosted use is permitted during SIH, but not required.

CURRENT IMPLEMENTATION STATUS

Milestone 1 — Deterministic Browser Vertical Slice: COMPLETE

Working pipeline:
Browser fixture
→ Chrome MV3 extension
→ local DOM observation
→ deterministic PII detection
→ local sanitization/redaction
→ privacy gate
→ SanitizedContext
→ FastAPI /api/assist
→ typed ActionResponse
→ local action validation
→ browser action execution

Verified:
- Backend tests: 3 passed
- Extension tests: 4 passed
- Browser E2E: passed
- POST /api/assist: verified
- Raw sensitive values transmitted: 0

Current backend port:
127.0.0.1:8001

Current limitation:
The implementation is currently DOM/deterministic only.
Local visual ML, screenshot perception, OCR/face detection,
server VLM/LLM reasoning, and advanced browser-agent behavior
have NOT yet been implemented.

NEXT MILESTONE:
Implement lightweight on-device visual perception and integrate
its sensitive-region output with the existing privacy gate.