# Project VEIL (Visual Extraction & Intelligent Local-redaction)

![VEIL Architecture](https://img.shields.io/badge/Architecture-Privacy_Middleware-000080)
![Status](https://img.shields.io/badge/Status-Prototype-green)

Built for **SIH 2026** solving the problem statement: *On-device Visual Perception for Light-weight Browser Agents*.

## The Problem
Enterprise environments and power users want the benefits of autonomous AI browser agents (like automatically filling forms or summarizing portals) but face a massive security hurdle: **AI agents require full access to the screen (DOM), exposing sensitive customer data, PII, and passwords to third-party cloud LLMs.**

## The Solution: VEIL
VEIL flips the standard AI agent architecture. Instead of an unrestricted AI capturing the DOM from the outside using tools like Puppeteer, **VEIL acts as a secure, local firewall installed inside the browser.** 

1. **Local Sanitization:** The VEIL Chrome Extension captures the live DOM and strictly scrubs all PII, passwords, and sensitive visual data *entirely locally on the user's machine*.
2. **Blindfolded AI:** VEIL sends only a safe, anonymized "skeleton" of the page to a central Python backend, which routes it to an LLM (Google Gemini). 
3. **Secure Execution:** The AI returns a proposed action based on the safe data. Our backend verifies the action isn't malicious and returns it to the extension, which executes the click or keystroke natively.

The AI does the heavy lifting, but the private data never leaves the computer.

---

## 🚀 Getting Started (Local Setup)

This repository contains two main components: the Python Backend and the Chrome Extension. 

### 1. Setup the Python Backend
The backend serves as the orchestrator, receiving sanitized payloads from the extension and securely communicating with the Google Gemini API.

```bash
cd backend
```

**Create a virtual environment and install dependencies:**
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

**Configure API Keys:**
Create a `.env` file inside the `backend/` directory:
```env
GEMINI_API_KEY="your_google_gemini_api_key_here"
```

**Run the Server:**
```bash
uvicorn app.main:app --reload --env-file .env
```
*The server will start on `http://127.0.0.1:8000`.*

### 2. Build the Chrome Extension
The extension runs the local privacy masking.

```bash
cd extension
npm install
npm run build
```
*(This uses `esbuild` to compile the TypeScript files into the `dist/` folder).*

**Load into Chrome:**
1. Open Chrome and navigate to `chrome://extensions/`.
2. Turn on **Developer mode** (top right corner).
3. Click **Load unpacked** and select the `Project_VEIL/extension/` directory.
4. Pin the VEIL icon to your toolbar.

---

## 🎮 Running the Demo

1. Ensure the Python backend is running.
2. We have provided a mock "Travel Booking" webpage loaded with fake PII (passwords, emails). Open it in your browser:
   - Navigate to `Project_VEIL/fixtures/demo.html` (You can start a simple static server here: `python -m http.server 8001`).
3. Click the VEIL extension icon in your Chrome toolbar.
4. Check your Python backend terminal! You will see the incoming `SanitizedContext` payload (notice how the emails and passwords are listed as `[REDACTED]`).
5. You will see the `=== AI DECISION ===` log in the terminal showing exactly what the AI proposed to do based on the safe structure!

---

## Repository Structure
- `/extension` - The Chrome extension (TypeScript). Contains local DOM masking algorithms.
- `/backend` - The FastAPI server orchestrating the LLM and enforcing action security (SEC-005).
- `/frontend` - A standalone mockup of the "Windows 95 Retro" dashboard UI for design purposes.
- `/docs` - Architecture and SIH problem statement analysis.
- `/fixtures` - Mock test pages (like `demo.html`) used to verify privacy compliance.
