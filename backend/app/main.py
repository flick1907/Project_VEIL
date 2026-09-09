import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from google import genai
from pydantic import ValidationError

from .prompts import SYSTEM_PROMPT
from .schemas import ActionResponse, ActionType, SanitizedContext, TypedAction

app = FastAPI(title="Project VEIL deterministic vertical slice")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_methods=["POST"],
    allow_headers=["content-type"],
)

from fastapi.staticfiles import StaticFiles

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures"
app.mount("/fixtures", StaticFiles(directory=FIXTURES_DIR), name="fixtures")

@app.get("/fixture")
def fixture() -> FileResponse:
    return FileResponse(FIXTURES_DIR / "demo.html")


def clean_schema(schema: dict) -> dict:
    """Recursively remove additionalProperties which Gemini OpenAPI parser rejects."""
    if isinstance(schema, dict):
        schema.pop("additionalProperties", None)
        for value in schema.values():
            clean_schema(value)
    elif isinstance(schema, list):
        for item in schema:
            clean_schema(item)
    return schema

@app.post("/api/assist", response_model=ActionResponse)
def assist(context: SanitizedContext) -> ActionResponse:
    """Return a safe action proposed by the LLM using only allowed sanitized elements."""
    print("\n--- RECEIVED DATA FROM EXTENSION ---")
    print(context.model_dump_json(indent=2))
    print("------------------------------------\n")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing")

    client = genai.Client(api_key=api_key)
    
    fallback_action = TypedAction(
        actionType=ActionType.scroll,
        scrollY=240,
        reason="Safe fallback triggered.",
        expiresAt=datetime.now(UTC) + timedelta(minutes=1),
    )

    try:
        schema = clean_schema(TypedAction.model_json_schema())
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=context.model_dump_json(indent=2),
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
        action = TypedAction.model_validate_json(response.text)
    except Exception as e:
        print(f"LLM Error: {e}")
        action = fallback_action

    # SEC-005 Security Check: Reject hallucinated or injected selectors
    if action.selector:
        allowed_selectors = {element.selector for element in context.elements}
        if action.selector not in allowed_selectors:
            print(f"SEC-005 ALERT: LLM proposed disallowed selector: {action.selector}")
            action = fallback_action
            action.reason = "Proposed action targeted a forbidden or hallucinated element. Falling back to scroll."

    # Override LLM's expiry to ensure it's securely managed by the server clock
    action.expiresAt = datetime.now(UTC) + timedelta(minutes=1)

    print("\n=== AI DECISION ===")
    print(f"Action: {action.actionType}")
    print(f"Target: {action.selector}")
    print(f"Reason: {action.reason}")
    print("===================\n")

    return ActionResponse(action=action)
