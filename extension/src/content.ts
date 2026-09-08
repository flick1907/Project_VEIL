import { executeAction } from "./actions.js";
import { observeAndSanitize } from "./sanitize.js";
import { sendSanitizedContext } from "./transport.js";

declare const chrome: { runtime: { onMessage: { addListener(listener: (message: unknown) => boolean | void): void } } };

function status(message: string): void {
  const element = document.querySelector("#veil-result");
  if (element) element.textContent = `VEIL: ${message}`;
}

async function runVerticalSlice(): Promise<void> {
  try {
    status("observing and sanitizing locally…");
    const context = observeAndSanitize(document, window.location.origin);
    status(`privacy gate passed; ${context.toPayload().redactions.length} region(s) masked`);
    const response = await sendSanitizedContext(context);
    const result = executeAction(response.action, document, window);
    status(`action completed — ${result}`);
  } catch (error) {
    status(`blocked — ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (typeof message === "object" && message !== null && (message as { type?: string }).type === "VEIL_RUN") {
    void runVerticalSlice();
  }
});

if (typeof window !== "undefined") {
  window.addEventListener("message", (event: MessageEvent) => {
    if (typeof event.data === "object" && event.data !== null && (event.data as { type?: string }).type === "VEIL_RUN") {
      void runVerticalSlice();
    }
  });
}

