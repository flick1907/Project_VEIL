import { ActionResponse, SanitizedContext } from "./contracts.js";

const API_URL = "http://127.0.0.1:8001/api/assist";

/** The only network path for page context. Raw objects are rejected at runtime. */
export async function sendSanitizedContext(context: SanitizedContext, fetchImpl: typeof fetch = fetch): Promise<ActionResponse> {
  if (!(context instanceof SanitizedContext)) throw new Error("Transport accepts SanitizedContext only");
  const payload = context.toPayload();
  const response = await fetchImpl(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Backend rejected sanitized context: ${response.status}`);
  return response.json() as Promise<ActionResponse>;
}
