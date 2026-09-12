import path from "path";
import puppeteer from "puppeteer";

const extensionPath = path.resolve("./");
// dom is fast (no ML). ocr and face need Tesseract/ONNX WASM cold-start time.
const FIXTURES = [
  { url: "http://127.0.0.1:8000/fixture",                   type: "dom",  timeoutMs: 30000 },
  { url: "http://127.0.0.1:8000/fixtures/canvas-pii.html",  type: "ocr",  timeoutMs: 90000 },
  { url: "http://127.0.0.1:8000/fixtures/face.html",        type: "face", timeoutMs: 90000 },
];

async function verify() {
  console.log("Launching browser with extension from:", extensionPath);
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
    ],
  });

  try {
    for (const fixture of FIXTURES) {
      console.log(`\n=======================================================`);
      console.log(`Testing Fixture: ${fixture.url} (${fixture.type})`);
      const page = await browser.newPage();
      
      let assistPayload = null;
      let payloadCaptured = false;
      const requestHandler = (req) => {
        if (req.url().includes("/api/assist") && req.method() === "POST") {
          assistPayload = req.postData();
          payloadCaptured = true;
          console.log(`INTERCEPTED POST /api/assist PAYLOAD for ${fixture.type}`);
        }
      };
      page.on("request", requestHandler);
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));
      page.on('requestfailed', request => {
        console.log(`PAGE LOG: Failed request: ${request.url()} - ${request.failure()?.errorText}`);
      });

      await page.goto(fixture.url, { waitUntil: "networkidle0" });

      // Inject #veil-result if missing
      await page.evaluate(() => {
        if (!document.querySelector("#veil-result")) {
          const res = document.createElement("p");
          res.id = "veil-result";
          res.textContent = "VEIL: extension idle";
          document.body.appendChild(res);
        }
      });

      const workerTarget = await browser.waitForTarget(
        (target) => target.type() === "service_worker" && target.url().includes("chrome-extension://"),
        { timeout: 10000 }
      );
      const worker = await workerTarget.worker();

      console.log("Dispatching VEIL_RUN...");
      await worker.evaluate(async () => {
        const tabs = await chrome.tabs.query({ active: true, windowType: "normal" });
        if (tabs.length > 0 && tabs[0].id) {
          await chrome.tabs.sendMessage(tabs[0].id, { type: "VEIL_RUN" });
        }
      });

      console.log(`Waiting for POST payload (timeout: ${fixture.timeoutMs / 1000}s)...`);
      // ML fixtures (OCR/face) need time for WASM cold-start + inference before the POST fires.
      // We poll node-side for the captured request flag.
      const pollInterval = 200;
      const maxPolls = fixture.timeoutMs / pollInterval;
      for (let i = 0; i < maxPolls; i++) {
        if (payloadCaptured) break;
        await new Promise(r => setTimeout(r, pollInterval));
      }

      if (!assistPayload) {
        throw new Error(`FAIL: No POST /api/assist request was captured for ${fixture.type}! (waited ${fixture.timeoutMs / 1000}s)`);
      }

      const payloadObj = JSON.parse(assistPayload);
      console.log(`\n=== PRIVACY GATE AUDIT [${fixture.type}] ===`);
      console.log("Redacted Regions:", payloadObj.redactions.length);

      if (fixture.type === "ocr") {
        if (payloadObj.redactions.length === 0) throw new Error("FAIL: OCR failed to detect PII!");
        if (!payloadObj.redactions.some(r => r.source === "ocr")) throw new Error("FAIL: OCR source not found in redactions!");
        console.log("SUCCESS: ML OCR successfully redacted regions!");
      }
      
      if (fixture.type === "face") {
        if (payloadObj.redactions.length === 0) throw new Error("FAIL: Face detection failed to detect face!");
        if (!payloadObj.redactions.some(r => r.source === "face")) throw new Error("FAIL: Face source not found in redactions!");
        console.log("SUCCESS: ML Face detection successfully redacted regions!");
      }

      const forbiddenValues = ["asha@example.com", "+91 9876543210", "demo-secret", "BOOK-26171", "Asha Kumar"];
      for (const secret of forbiddenValues) {
        if (assistPayload.includes(secret)) {
          throw new Error(`PRIVACY VIOLATION: Raw secret '${secret}' was present!`);
        }
      }
      console.log(`SUCCESS: ${fixture.type} fixture passed.`);
      await page.close();
    }
    console.log("\nALL E2E VERIFICATIONS PASSED!");
  } finally {
    await browser.close();
  }
}

verify().catch((err) => {
  console.error("E2E Verification failed:", err);
  process.exit(1);
});
