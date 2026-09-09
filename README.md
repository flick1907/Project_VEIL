# Project VEIL
### Visual Extraction & Intelligent Local-redaction

![SIH 2026](https://img.shields.io/badge/SIH_2026-Finalist-navy)
![Status](https://img.shields.io/badge/Status-Working_Prototype-brightgreen)
![Tests](https://img.shields.io/badge/Tests-6_Unit_%7C_2_E2E-brightgreen)
![Branch](https://img.shields.io/badge/Branch-update__v1-blue)

> **Built for Smart India Hackathon 2026** — solving the problem statement: *On-device Visual Perception for Lightweight Browser Agents*.

---

## The Problem

Enterprise environments and power users want the benefits of autonomous AI browser agents (auto-filling forms, summarising portals, extracting data) but face a massive security hurdle:

**Standard AI agents need unrestricted access to the full screen and DOM — exposing passwords, PII, and sensitive customer data to third-party cloud LLMs.**

## The Solution: VEIL

VEIL flips the standard AI agent architecture. Instead of an unrestricted agent capturing everything from the outside, **VEIL acts as a secure, local privacy firewall installed inside the browser itself.**

```
┌─────────────────────────────────────────────────────────────────┐
│  USER'S MACHINE (Nothing private ever leaves this boundary)     │
│                                                                 │
│  ┌──────────────────┐   screenshot    ┌────────────────────┐   │
│  │  Active Web Page │ ──────────────▶ │  VEIL Extension    │   │
│  │  (with PII,      │                 │                     │   │
│  │   passwords,     │   VEIL_RUN      │  1. captureTab()   │   │
│  │   faces)         │ ◀─────────────  │  2. ONNX FaceDetect│   │
│  └──────────────────┘                 │  3. Tesseract OCR  │   │
│                                       │  4. DOM sanitize   │   │
│                                       │  5. Privacy gate   │   │
│                                       └────────┬───────────┘   │
│                                                │ safe skeleton  │
└────────────────────────────────────────────────┼────────────────┘
                                                 │
                                    ┌────────────▼───────────┐
                                    │  Python Backend        │
                                    │  (FastAPI + Gemini)    │
                                    │                        │
                                    │  SEC-005 selector      │
                                    │  allowlist check       │
                                    └────────────┬───────────┘
                                                 │ safe action
                                    ┌────────────▼───────────┐
                                    │  Google Gemini LLM     │
                                    │  (sees NO raw PII)     │
                                    └────────────────────────┘
```

**The AI does the heavy lifting — but private data never leaves the device.**

---

## What's Fully Working (as of this build)

### On-Device ML Perception Pipeline
| Component | Status | Details |
|---|---|---|
| **Face Detection** | Working | UltraFace (RFB-320) ONNX model via `onnxruntime-web`, wasm-only, single-threaded for extension compatibility |
| **OCR / Text Recognition** | Working | Tesseract.js v5 running fully locally; detects text rendered in `<canvas>` (not just DOM) |
| **Screen Capture** | Working | `chrome.tabs.captureVisibleTab()` via background service worker (`VEIL_CAPTURE` message) |

### Privacy Gate (DOM Sanitizer)
| Feature | Status | Details |
|---|---|---|
| **Password masking** | Working | Any `input[type=password]` is `blackout`-redacted |
| **Email / Phone PII** | Working | Regex-matched and `mask`-redacted before transport |
| **Canvas PII** | Working | OCR pipeline detects text rendered to canvas pixels and generates ML redaction regions |
| **Face regions** | Working | Face detector generates blur regions over detected faces |
| **Transport contract** | Working | TypeScript branded types (`SanitizedContext`) enforce that raw DOM never reaches the network layer |

### Dashboard (Confirmation UI)
| Feature | Status | Details |
|---|---|---|
| **Retro Win95 UI** | Working | Fullscreen confirmation dialog shown before any action executes |
| **Pending action recovery** | Working | `VEIL_GET_PENDING_ACTION` allows dashboard to resume if opened after the extension already analyzed a page |
| **Approve / Deny flow** | Working | User explicitly approves or denies every proposed LLM action |

### Backend + LLM
| Feature | Status | Details |
|---|---|---|
| **FastAPI server** | Working | Receives sanitized payload, logs it, calls Gemini |
| **Gemini integration** | Working | `google-genai` SDK with structured JSON response schema |
| **SEC-005 selector allowlist** | Working | LLM cannot hallucinate selectors; only selectors present in the sanitized context are allowed |
| **Action expiry** | Working | Server stamps `expiresAt` on every action; server clock is authoritative |
| **Safe fallback** | Working | On any LLM error or 503, falls back to a safe `scroll` action |
| **Fixture routes** | Working | Backend serves all test fixture HTML pages statically |

### Test Suite
| Suite | Status | Details |
|---|---|---|
| **Unit tests (6/6 pass)** | Passing | Privacy gate serialization, transport contract, face/password/PII/capture field enforcement |
| **E2E: DOM fixture** | Passing | Verifies 4 redacted regions (email, phone, password, order-id) make it into the payload |
| **E2E: Face fixture** | Passing | Verifies ONNX face detector fires and generates at least 1 `blur` redaction region |

---

## Quick Start

### Prerequisites
- **Node.js** >= 18
- **Python** >= 3.11
- **Google Chrome** (stable)
- A **Google Gemini API key** (free tier works)

---

### 1. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Start the server:
```bash
uvicorn app.main:app --reload --env-file .env
```
> Server runs at `http://127.0.0.1:8000`

---

### 2. Extension Setup

```bash
cd extension
npm install
npm run build
```

`npm run build` automatically:
- Downloads `face-detector.onnx` from GitHub (UltraFace RFB-320, ~1.2 MB)
- Downloads `eng.traineddata.gz` from tessdata (Tesseract English language pack)
- Copies all `ort-wasm-simd-threaded.*` WASM + MJS files from `onnxruntime-web`
- Copies Tesseract worker + core WASM into `assets/models/tesseract/`
- Compiles TypeScript into `dist/`

**Load into Chrome:**
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `extension/` folder
4. Pin the VEIL icon to your toolbar

---

### 3. Run the Demo

1. Navigate to `http://127.0.0.1:8000/fixture` — a mock Travel Booking page with fake PII
2. Click the **VEIL** extension icon in the toolbar
3. The extension will:
   - Take a screenshot and run face detection + OCR locally
   - Draw redaction boxes over PII directly on the page
   - Open the dashboard asking you to approve the proposed action
4. Check the backend terminal — you will see the sanitized payload (all sensitive fields show `"valueState": "redacted"`) and the LLM decision below it

---

### 4. Run Tests

```bash
cd extension
npm test
```

This runs:
1. **6 unit tests** via Node's built-in test runner (privacy gate contracts)
2. **E2E suite** via Puppeteer — launches a real Chrome instance with the extension loaded, navigates to fixture pages, fires `VEIL_RUN`, and validates the outgoing POST payload

---

## Repository Structure

```
Project_VEIL/
├── .agent/                     # AI-authored planning docs
│   ├── 00_PROJECT_CONTEXT.md
│   ├── 01_PROBLEM_STATEMENT.md
│   ├── 02_PRODUCT_VISION.md
│   ├── 03_REQUIREMENTS.md
│   ├── 04_ARCHITECTURE.md
│   ├── 06_AI_ML_PLAN.md
│   └── 07_PRIVACY_SECURITY.md
│
├── backend/                    # Python FastAPI server
│   ├── app/
│   │   ├── main.py             # API routes, Gemini call, SEC-005 check
│   │   ├── schemas.py          # Pydantic models (SanitizedContext, TypedAction)
│   │   └── prompts.py          # Gemini system prompt
│   └── requirements.txt
│
├── extension/                  # Chrome Extension (TypeScript, MV3)
│   ├── src/
│   │   ├── content.ts          # Main pipeline orchestrator (runs in page context)
│   │   ├── background.ts       # Service worker (captureTab, pending action store)
│   │   ├── sanitize.ts         # DOM observer + privacy gate
│   │   ├── transport.ts        # Branded type enforcer
│   │   ├── actions.ts          # Action executor (click, type, scroll, extract)
│   │   ├── contracts.ts        # Shared TypeScript interfaces
│   │   ├── popup.ts            # Extension popup (triggers VEIL_RUN)
│   │   └── perception/
│   │       ├── face.ts         # ONNX face detector (UltraFace RFB-320, wasm)
│   │       ├── ocr.ts          # Tesseract.js OCR (detects canvas-rendered PII)
│   │       └── benchmark.ts    # Performance benchmarking utilities
│   ├── tests/
│   │   ├── privacy.test.ts     # Unit tests (6 tests)
│   │   └── verify_e2e.js       # Puppeteer E2E suite
│   ├── scripts/
│   │   └── fetch_models.js     # Downloads + copies ML model files at build time
│   └── manifest.json           # Chrome MV3 manifest
│
├── frontend/                   # Confirmation Dashboard (Win95 retro UI)
│   ├── index.html
│   ├── app.js                  # Dashboard logic + pending action polling
│   └── styles.css
│
├── fixtures/                   # Test pages served by the backend
│   ├── demo.html               # Main demo: Travel Booking page with fake PII
│   ├── face.html               # Face detection test fixture
│   ├── canvas-pii.html         # OCR test: PII rendered to canvas pixels
│   ├── adversarial.html        # Prompt injection adversarial test
│   └── visual-fallback.html    # Visual-only page (no semantic DOM)
│
└── README.md
```

---

## Security Architecture Highlights

- **Zero raw data on wire:** The TypeScript branded type system (`SanitizedContext`) makes it a compile-time error to accidentally send un-sanitized data to the network.
- **SEC-005 Selector Allowlist:** The backend rejects any LLM response targeting a CSS selector not present in the incoming sanitized payload — preventing prompt injection from hijacking the agent.
- **Action expiry:** Every action token has a server-stamped `expiresAt` timestamp (1 minute). The extension checks this before executing, preventing replay attacks.
- **Local ML first:** Face detection and OCR run entirely on-device via WebAssembly before any network call is made. The LLM never sees a raw face or raw PII text.
- **User in the loop:** The dashboard requires explicit human approval before any action is executed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | TypeScript, Chrome MV3, esbuild |
| Face Detection | ONNX Runtime Web (wasm), UltraFace RFB-320 |
| OCR | Tesseract.js v5 (wasm) |
| Backend | Python 3.11, FastAPI, Uvicorn |
| LLM | Google Gemini (`gemini-3.6-flash`) via `google-genai` SDK |
| Testing | Node.js built-in test runner, Puppeteer (E2E) |
| Dashboard | Vanilla HTML/CSS/JS (Win95 retro aesthetic) |
