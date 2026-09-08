import path from "path";
import puppeteer from "puppeteer";

const extensionPath = path.resolve("./");
const fixtureUrl = "http://127.0.0.1:8001/fixture";

async function verify() {
  console.log("Launching browser with extension from:", extensionPath);
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
    ],
  });

  try {
    const page = await browser.newPage();
    
    let assistPayload = null;
    page.on("request", (req) => {
      if (req.url().includes("/api/assist") && req.method() === "POST") {
        assistPayload = req.postData();
        console.log("\n=======================================================");
        console.log("INTERCEPTED POST /api/assist PAYLOAD:");
        console.log(assistPayload);
        console.log("=======================================================\n");
      }
    });

    await page.goto(fixtureUrl, { waitUntil: "networkidle0" });

    const initialResult = await page.$eval("#veil-result", (el) => el.textContent);
    console.log("Initial fixture status:", initialResult);

    const workerTarget = await browser.waitForTarget(
      (target) => target.type() === "service_worker" && target.url().includes("chrome-extension://"),
      { timeout: 10000 }
    );

    console.log("Found Extension Service Worker:", workerTarget.url());
    const worker = await workerTarget.worker();

    console.log("Dispatching VEIL_RUN message from background service worker to active tab...");
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { type: "VEIL_RUN" });
      }
    });

    await page.waitForFunction(
      () => document.querySelector("#veil-result")?.textContent?.includes("action completed"),
      { timeout: 10000 }
    );

    const finalResult = await page.$eval("#veil-result", (el) => el.textContent);
    console.log("Final fixture status:", finalResult);

    if (!assistPayload) {
      throw new Error("FAIL: No POST /api/assist request was captured!");
    }

    const payloadObj = JSON.parse(assistPayload);
    console.log("\n=== PRIVACY GATE AUDIT ===");
    console.log("Protocol Version:", payloadObj.protocolVersion);
    console.log("Origin:", payloadObj.pageOrigin);
    console.log("Redacted Regions:", payloadObj.redactions);
    console.log("Safe Elements:", payloadObj.elements);

    const forbiddenValues = ["asha@example.com", "+91 9876543210", "demo-secret", "BOOK-26171", "Asha Kumar"];
    for (const secret of forbiddenValues) {
      if (assistPayload.includes(secret)) {
        throw new Error(`PRIVACY VIOLATION DETECTED: Raw secret '${secret}' was present in payload!`);
      }
    }
    console.log("\nSUCCESS: Privacy gate passed! No raw PII/secrets present in network payload.");
    console.log("SUCCESS: Vertical slice verified end-to-end!");
  } finally {
    await browser.close();
  }
}

verify().catch((err) => {
  console.error("E2E Verification failed:", err);
  process.exit(1);
});
