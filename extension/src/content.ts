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
      
      console.log(`ML Perception completed. Faces: ${faces.length}, Words detected: ${text.length}`);
      if (text.length > 0) {
        console.log(`Words: ${text.map(t => t.text).join(', ')}`);
      }
      
      // Convert OCR text to PII regions — only flag actual PII patterns,
      // NOT plain English UI labels like "Name", "Email", "Phone", "Find booking".
      //
      // PII patterns we detect visually (for canvas-rendered content the DOM can't see):
      //   - Email addresses:      contains "@"
      //   - Phone numbers:        4+ consecutive digits (with optional separators)
      //   - Alphanumeric IDs:     mixed letters+numbers like "BOOK-26171", "TXN-9921"
      //   - Pure number strings:  credit card / SSN / order number type values
      //
      // We deliberately do NOT mask:
      //   - Pure dictionary words (UI labels, headings, button text)
      //   - Short common words

      const EMAIL_RE    = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
      const PHONE_RE    = /(\+?\d[\d\s\-().]{6,}\d)/;
      const ALPHANUM_ID = /^[A-Z]{2,}-\d+$|^[A-Z0-9]{5,}$/;   // e.g. BOOK-26171, TXN99211
      const PURE_NUM    = /^\d{4,}$/;                           // 4+ digit number

      for (const t of text) {
        const word = t.text.trim();
        if (!config.maskPii || word.length < 3) continue;

        let category: PiiCategory | null = null;

        if (EMAIL_RE.test(word)) {
          category = "email";
        } else if (PHONE_RE.test(word)) {
          category = "phone";
        } else if (PURE_NUM.test(word)) {
          category = "phone";           // treat bare digit strings as sensitive numbers
        } else if (ALPHANUM_ID.test(word)) {
          category = "id";
        }

        if (category) {
          console.log(`OCR PII detected: "${word}" → ${category}`);
          mlRegions.push({
            box: [t.box.x, t.box.y, t.box.width, t.box.height],
            category,
            transform: "mask",
            source: "ocr"
          });
        }
      }

    } else {
      console.error("VEIL_CAPTURE failed:", captureRes);
    }

    // Create a visual overlay so you can actually SEE the ML boxes on the screen!
    const existingOverlay = document.getElementById("veil-ml-overlay");
    if (existingOverlay) existingOverlay.remove();

    if (mlRegions.length > 0) {
      // captureVisibleTab() captures in physical pixels, but CSS uses logical (CSS) pixels.
      // On high-DPI screens (e.g. 125%, 150% scaling), we must divide by devicePixelRatio.
      const dpr = window.devicePixelRatio || 1;

      const overlay = document.createElement("div");
      overlay.id = "veil-ml-overlay";
      overlay.style.position = "fixed";    // fixed = relative to viewport, matching the screenshot
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "999999";
      
      for (const region of mlRegions) {
        if (region.box) {
          const boxEl = document.createElement("div");
          boxEl.style.position = "absolute";
          boxEl.style.left = `${region.box[0] / dpr}px`;
          boxEl.style.top = `${region.box[1] / dpr}px`;
          boxEl.style.width = `${region.box[2] / dpr}px`;
          boxEl.style.height = `${region.box[3] / dpr}px`;
          boxEl.style.backgroundColor = region.transform === "blur" ? "rgba(150, 150, 150, 0.9)" : "black";
          boxEl.style.border = "2px solid red";
          boxEl.style.color = "white";
          boxEl.style.fontSize = "12px";
          boxEl.style.fontWeight = "bold";
          boxEl.innerText = region.category.toUpperCase();
          overlay.appendChild(boxEl);
        }
      }
      document.body.appendChild(overlay);
    }

    status("Observing and sanitizing locally…", 30);
    const context = observeAndSanitize(document, window.location.origin, config, mlRegions);
    status(`Privacy gate passed; ${context.toPayload().redactions.length} region(s) masked`, 60, false, { gatePassed: true, fallback: context.toPayload().elements.length === 0 });
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
