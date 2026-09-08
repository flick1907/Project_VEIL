from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .schemas import ActionResponse, ActionType, SanitizedContext, TypedAction

app = FastAPI(title="Project VEIL deterministic vertical slice")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8001", "http://localhost:8001"],
    allow_methods=["POST"],
    allow_headers=["content-type"],
)

FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "demo.html"


@app.get("/fixture")
def fixture() -> FileResponse:
    return FileResponse(FIXTURE)


@app.post("/api/assist", response_model=ActionResponse)
def assist(context: SanitizedContext) -> ActionResponse:
    """Return a deterministic, safe action using only allowed sanitized elements."""
    safe_status = next(
        (element for element in context.elements if element.selector == "#booking-status" and element.tag == "p"),
        None,
    )
    if safe_status and "extract_safe_text" in context.allowedActions:
        action = TypedAction(
            actionType=ActionType.extract_safe_text,
            selector="#booking-status",
            expectedTag="p",
            reason="Read the non-sensitive booking status exposed in sanitized context.",
            expiresAt=datetime.now(UTC) + timedelta(minutes=1),
        )
    else:
        action = TypedAction(
            actionType=ActionType.scroll,
            scrollY=240,
            reason="No safe status element was available; perform a bounded scroll.",
            expiresAt=datetime.now(UTC) + timedelta(minutes=1),
        )
    return ActionResponse(action=action)
