import assert from "node:assert/strict";
import test from "node:test";
import { SanitizedContext } from "../src/contracts.js";
import { verifyAndCreateSanitizedContext } from "../src/sanitize.js";
import { sendSanitizedContext } from "../src/transport.js";

const validPayload = {
  protocolVersion: "veil.v2" as const,
  pageOrigin: "http://127.0.0.1:8000",
  captureId: "fixture-1",
  redactions: [{ selector: "#email", category: "email" as const, transform: "mask" as const, source: "pattern" as const }],
  elements: [{ selector: "#search", tag: "input" as const, role: null, label: "Search", text: null, inputType: "search", valueState: "empty" as const }],
  allowedActions: ["extract_safe_text" as const],
};

test("privacy gate strips unknown fields before transport serialization", () => {
  const context = verifyAndCreateSanitizedContext({ ...validPayload, rawDom: "alice@example.com" } as typeof validPayload);
  const sent = context.toPayload() as unknown as Record<string, unknown>;
  assert.equal("rawDom" in sent, false);
  assert.equal(JSON.stringify(sent).includes("alice@example.com"), false);
});

test("privacy gate rejects raw password-like candidate fields", () => {
  assert.throws(
    () => verifyAndCreateSanitizedContext({ ...validPayload, password: "super-secret" } as typeof validPayload),
    /Sensitive raw field/,
  );
});

test("transport rejects raw objects and only emits branded sanitized context", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (_url, init) => {
    calls += 1;
    assert.equal(String(init?.body).includes("alice@example.com"), false);
    return new Response(JSON.stringify({ action: { actionType: "scroll", scrollY: 0, reason: "test", expiresAt: "2999-01-01T00:00:00Z" } }), { status: 200 });
  };
  await assert.rejects(() => sendSanitizedContext({ rawDom: "alice@example.com" } as unknown as SanitizedContext, fakeFetch));
  assert.equal(calls, 0);
  await sendSanitizedContext(verifyAndCreateSanitizedContext(validPayload), fakeFetch);
  assert.equal(calls, 1);
});

test("privacy gate sanitizes element labels with sensitive keywords", () => {
  const context = verifyAndCreateSanitizedContext({
    ...validPayload,
    elements: [
      { selector: "#password", tag: "input" as const, role: null, label: null, text: null, inputType: "password", valueState: "redacted" as const },
    ],
  });
  const payload = context.toPayload();
  const rawText = JSON.stringify(payload).toLowerCase();
  assert.equal(rawText.includes('"label":"password"'), false);
});

test("privacy gate rejects raw capture fields from reaching transport", () => {
  assert.throws(
    () => verifyAndCreateSanitizedContext({ ...validPayload, dataUrl: "data:image/png;base64,fake" } as typeof validPayload),
    /Sensitive raw field/,
  );
  assert.throws(
    () => verifyAndCreateSanitizedContext({ ...validPayload, rawScreenshot: "bitmap_reference" } as typeof validPayload),
    /Sensitive raw field/,
  );
});

test("face detection regions use the blur transform", () => {
  const payloadWithFace = {
    ...validPayload,
    redactions: [
      { selector: "#profile-picture", category: "configured" as const, transform: "blur" as const, source: "face" as const }
    ]
  };
  const context = verifyAndCreateSanitizedContext(payloadWithFace);
  const sent = context.toPayload();
  assert.equal(sent.redactions[0].transform, "blur");
  assert.equal(sent.redactions[0].source, "face");
});
