from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def valid_context() -> dict:
    return {
        "protocolVersion": "veil.v2",
        "pageOrigin": "http://127.0.0.1:8000",
        "captureId": "fixture-1",
        "redactions": [
            {"selector": "#email", "category": "email", "transform": "mask", "source": "pattern"}
        ],
        "elements": [
            {
                "selector": "#booking-status",
                "tag": "p",
                "role": None,
                "label": "Booking status",
                "text": "Booking ready for review",
                "valueState": "not_applicable",
            }
        ],
        "allowedActions": ["extract_safe_text"],
    }


def test_valid_sanitized_context_returns_typed_action() -> None:
    response = client.post("/api/assist", json=valid_context())
    assert response.status_code == 200
    action = response.json()["action"]
    assert action["actionType"] == "extract_safe_text"
    assert action["selector"] == "#booking-status"


def test_backend_rejects_raw_password_and_unknown_fields() -> None:
    payload = valid_context()
    payload["password"] = "not-allowed"
    response = client.post("/api/assist", json=payload)
    assert response.status_code == 422


def test_backend_rejects_raw_email_in_safe_text() -> None:
    payload = valid_context()
    payload["elements"][0]["text"] = "alice@example.com"
    response = client.post("/api/assist", json=payload)
    assert response.status_code == 422


def test_backend_rejects_v1_protocol() -> None:
    payload = valid_context()
    payload["protocolVersion"] = "veil.v1"
    response = client.post("/api/assist", json=payload)
    assert response.status_code == 422
