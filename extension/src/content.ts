import { executeAction } from "./actions.js";
import { observeAndSanitize } from "./sanitize.js";
import { sendSanitizedContext } from "./transport.js";

declare const chrome: { 
  runtime: { sendMessage(message: unknown, responseCallback?: (response: any) => void): void, onMessage: { addListener(listener: (message: unknown) => boolean | void): void } },
  storage: { local: { get(keys: string[]): Promise<any>, set(items: any): Promise<void> } }
};

function status(message: string, progress?: number, isWarning = false, extraState?: any): void {
  const element = document.querySelector("#veil-result");
  if (element) element.textContent = `VEIL: ${message}`;
  chrome.runtime.sendMessage({ type: "VEIL_STATE_UPDATE", payload: message, progress, isWarning, ...extraState });
}

import { detectFaces } from "./perception/face.js";
import { detectText } from "./perception/ocr.js";
import { Region, PiiCategory } from "./contracts.js";

async function runVerticalSlice(): Promise<void> {
  try {
    status("Session started", 10, false, { sessionStatus: 'ACTIVE', observer: true, fallback: false });
    
    const storage = await chrome.storage.local.get(['maskPasswords', 'maskPii', 'blurFaces']);
    const config = {
      maskPasswords: storage.maskPasswords !== false,
      maskPii: storage.maskPii !== false,
      blurFaces: storage.blurFaces !== false
    };

    let mlRegions: Region[] = [];
    status("Capturing screen for visual perception...", 20);
    const captureRes: any = await new Promise((resolve) => chrome.runtime.sendMessage({ type: "VEIL_CAPTURE" }, resolve));
    
    if (captureRes && captureRes.dataUrl) {
      status("Running local ML perception...", 25);
      const res = await fetch(captureRes.dataUrl);
      const blob = await res.blob();
      const imageBitmap = await createImageBitmap(blob);
      
      const [faces, text] = await Promise.all([
        detectFaces(imageBitmap),
        detectText(imageBitmap)
      ]);
      
      if (config.blurFaces) {
        mlRegions.push(...faces);
      }
      
      // Push OCR matches into mlRegions so they reach the privacy gate payload.
      // This is essential for canvas/image fixtures where DOM inspection can't see PII.
      // Note: OCR box coordinates are excluded from the VISUAL overlay (selector-only rendering),
      // so they won't produce misaligned floating boxes on DOM-based fixtures.
      console.log(`ML Perception completed. Faces: ${faces.length}, Words detected: ${text.length}`);
      for (const t of text) {
        const textStr = t.text.trim();
        const isEmailPart = textStr.includes('@') || textStr.toLowerCase().endsWith('.com');
        const isPhonePart = /\d{10}/.test(textStr) || (/\d{4,}/.test(textStr) && textStr.length > 8);
        const isPasswordPart = /\*{3,}|•{3,}/.test(textStr);

        if (config.maskPii && (isEmailPart || isPhonePart || isPasswordPart)) {
          console.log(`OCR PII token detected (adding to redactions, not overlaid): "${textStr}"`);
          mlRegions.push({
            box: [t.box.x, t.box.y, t.box.width, t.box.height],
            category: isPasswordPart ? "password" : (isPhonePart ? "phone" : "email"),
            transform: isPasswordPart ? "blackout" : "mask",
            source: "ocr"
          });
        }
      }
      
    } else {
      console.error("VEIL_CAPTURE failed:", captureRes);
    }

    status("Observing and sanitizing locally…", 30);
    const context = observeAndSanitize(document, window.location.origin, config, mlRegions);
    const payload = context.toPayload();
    status(`Privacy gate passed; ${payload.redactions.length} region(s) masked`, 60, false, { gatePassed: true, fallback: payload.elements.length === 0 });

    // Draw overlay using DOM-selector positions only — pixel-perfect over real inputs.
    // Box-based (screenshot/OCR) regions are intentionally skipped: screenshot coordinates
    // don't map cleanly to CSS layout, causing the floating false-positive boxes seen earlier.
    const existingOverlay = document.getElementById("veil-ml-overlay");
    if (existingOverlay) existingOverlay.remove();

    const selectorRedactions = payload.redactions.filter(r => r.selector && !r.box);

    if (selectorRedactions.length > 0) {
      const overlay = document.createElement("div");
      overlay.id = "veil-ml-overlay";
      overlay.style.position = "fixed";    // fixed = relative to viewport, matching the screenshot
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "999999";

      for (const region of selectorRedactions) {
        try {
          const el = document.querySelector(region.selector!);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const left = rect.left + window.scrollX;
          const top = rect.top + window.scrollY;

          const boxEl = document.createElement("div");
          boxEl.style.position = "absolute";
          boxEl.style.left = `${left}px`;
          boxEl.style.top = `${top}px`;
          boxEl.style.width = `${rect.width}px`;
          boxEl.style.height = `${rect.height}px`;
          boxEl.style.backgroundColor = region.transform === "blur" ? "rgba(150,150,150,0.9)" : "black";
          boxEl.style.border = "2px solid red";
          boxEl.style.color = "white";
          boxEl.style.fontSize = "11px";
          boxEl.style.fontWeight = "bold";
          boxEl.style.display = "flex";
          boxEl.style.alignItems = "center";
          boxEl.style.paddingLeft = "6px";
          boxEl.style.boxSizing = "border-box";
          boxEl.innerText = region.category.toUpperCase();
          overlay.appendChild(boxEl);
        } catch (_) { /* skip invalid selectors */ }
      }
      document.body.appendChild(overlay);
    }
    const response = await sendSanitizedContext(context);
    status(`Server Action Proposed: ${response.action.actionType}`, 80);
    const result = await executeAction(response.action, document, window);
    status(`Action completed — ${result}`, 100, false, { sessionStatus: 'READY' });
  } catch (error) {
    status(`Blocked — ${error instanceof Error ? error.message : "unknown error"}`, 100, true, { gatePassed: false, sessionStatus: 'READY' });
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
