# Product Vision

## Target user

[PROPOSED] A browser user completing a multi-step digital workflow who wants contextual assistance without exposing passwords, faces, identity details, or other sensitive screen content to a remote AI service.

## User problem

[INTERPRETATION] Existing browser assistance often requires sending a screenshot, page content, or broad browsing context to a remote service. That is unsafe or unacceptable when the screen contains credentials, personal identifiers, account details, or faces. At the same time, purely text- or DOM-based assistance can miss visual information that determines what the user should do next.

## Core value proposition

[PROPOSED] VEIL helps a user understand and complete a browser task using context that is perceived and sanitized on-device first, so the remote reasoning component receives only the minimum useful, anonymized representation.

## Main user workflow

1. [PROPOSED] The user starts or authorizes a VEIL assistance session for a browser task.
2. [PROPOSED] The extension observes the relevant current page state through DOM and visual signals.
3. [PROPOSED] The client identifies sensitive content, redacts it locally, and constructs minimal sanitized context.
4. [PROPOSED] The server returns guidance or a structured action proposal based only on that context.
5. [PROPOSED] The client validates the proposal against the live page and asks for confirmation when policy requires it.
6. [PROPOSED] VEIL executes a permitted action or presents the user with the next safe step and records an audit event.

## Main capabilities

- [CONFIRMED] In-browser visual perception of the current screen.
- [CONFIRMED] Dynamic detection and local redaction of sensitive elements.
- [CONFIRMED] Transmission of anonymized context to server-side LLM/VLM reasoning.
- [CONFIRMED] Server-provided processed results or browser UI actions.
- [PROPOSED] Explicit session control, redaction status, and action feedback visible to the user.
- [PROPOSED] Structured, locally validated action proposals rather than arbitrary remote script execution.

## MVP scope

[PROPOSED] A student-team MVP should demonstrate one narrow browser workflow across controlled test pages and at least the named browsers. It should show: a page with ordinary task context plus passwords, PII, and a face; local detection and visible redaction; a sanitized request trace; server reasoning; and one or more safe, user-authorized actions or guidance steps. It should measure the five SIH criteria with a small, reproducible fixture suite.

## Example real-world use cases

- [PROPOSED] Assist a user in navigating a multi-step online form while masking prefilled identity and contact details.
- [PROPOSED] Help identify the next navigation step in a support or service portal while blacking out credentials and account data.
- [PROPOSED] Summarize visible task state or guide a workflow containing profile images and sensitive rendered text without sending those regions remotely.

## Out-of-scope functionality

- [PROPOSED] A general-purpose autonomous browsing agent with unrestricted click, form-entry, purchase, account-change, or download authority.
- [PROPOSED] Persistent collection of browsing history, raw screenshots, or user profiles.
- [PROPOSED] Broad commercial integrations, production-scale identity management, or a multi-product roadmap.
- [TBD] Any task that cannot be safely demonstrated within the chosen consent and action policy.
