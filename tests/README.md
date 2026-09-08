# Test layout

- `extension/tests/` verifies that only a branded, privacy-gate-created `SanitizedContext` reaches the extension transport.
- `backend/tests/` verifies strict FastAPI schema rejection of raw fields and typed action responses.
