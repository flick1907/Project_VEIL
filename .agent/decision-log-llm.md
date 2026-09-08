# Decision Log: LLM Integration

**Date**: 2026-09-08
**Decision**: Use `google-genai` (Gemini API) for server-side reasoning.
**Status**: [PROPOSED]

## Context
Milestone 2 required replacing the mock deterministic `if/else` logic in the backend with a real LLM/VLM capable of understanding the `SanitizedContext`. The user requested to use an existing hosted model rather than implementing/hosting a custom model from scratch.

## Chosen Solution
We have integrated the **Google Gemini 2.5 Flash** model via the official `google-genai` Python SDK.

## Rationale
1. **Speed and Latency**: Gemini 2.5 Flash provides exceptional inference latency, which is critical for the browser extension's responsiveness metric (SIH evaluation criteria).
2. **Structured JSON Output**: The SDK provides native support for `response_schema`, easily mapping the LLM's output directly to our Pydantic `TypedAction` model. This eliminates fragile regex parsing or manual JSON extraction.
3. **Context Window**: It easily handles the potentially large JSON context payload representing the safe structural page elements.
4. **Availability**: API keys are readily accessible and the package is standard.

## Security Considerations
We pass only the `SanitizedContext` payload. A strict SEC-005 check intercept was added to the backend loop to explicitly reject any hallucinatory selectors the LLM proposes that weren't strictly provided in the context, preventing prompt injection attacks from manipulating extension actions.
