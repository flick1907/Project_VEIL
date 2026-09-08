from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PiiCategory(str, Enum):
    password = "password"
    email = "email"
    phone = "phone"
    configured = "configured"


class Redaction(StrictModel):
    selector: str = Field(pattern=r"^(#|\[data-veil-observe)")
    category: PiiCategory
    transform: Literal["blackout", "mask", "blur"]
    source: Literal["dom", "pattern", "face", "ocr"]


class SafeElement(StrictModel):
    selector: str = Field(pattern=r"^(#|\[data-veil-observe)")
    tag: Literal["input", "button", "p", "span", "div"]
    role: str | None = Field(default=None, max_length=160)
    label: str | None = Field(default=None, max_length=160)
    text: str | None = Field(default=None, max_length=160)
    inputType: str | None = Field(default=None, max_length=80)
    valueState: Literal["empty", "redacted", "not_applicable"]


class SanitizedContext(StrictModel):
    protocolVersion: Literal["veil.v2"]
    pageOrigin: str = Field(pattern=r"^https?://")
    captureId: str = Field(min_length=1, max_length=128)
    redactions: list[Redaction]
    elements: list[SafeElement] = Field(max_length=100)
    allowedActions: list[Literal["click", "type", "scroll", "extract_safe_text", "navigate"]]

    @field_validator("elements")
    @classmethod
    def reject_raw_sensitive_text(cls, elements: list[SafeElement]) -> list[SafeElement]:
        forbidden = ("@", "password", "secret")
        for element in elements:
            value = " ".join(part for part in (element.text, element.label) if part).lower()
            if any(marker in value for marker in forbidden):
                raise ValueError("Sanitized context must not include raw sensitive text")
        return elements


class ActionType(str, Enum):
    click = "click"
    type = "type"
    scroll = "scroll"
    extract_safe_text = "extract_safe_text"
    navigate = "navigate"


class TypedAction(StrictModel):
    actionType: ActionType
    selector: str | None = Field(default=None, pattern=r"^#")
    expectedTag: str | None = Field(default=None, max_length=20)
    text: str | None = Field(default=None, max_length=160)
    scrollY: int | None = Field(default=None, ge=-1000, le=1000)
    url: str | None = None
    reason: str = Field(min_length=1, max_length=240)
    expiresAt: datetime


class ActionResponse(StrictModel):
    action: TypedAction
