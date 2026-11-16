"""Executable examples for docs/interface-contract.md (FR-5 / US-5)."""
from datetime import datetime, timedelta

import pytest


def test_create_note_contract_success(client, auth_headers_factory):
    user, headers = auth_headers_factory()
    response = client.post("/api/v1/notes", headers=headers, json={
        "text": "  После занятия: 10 минут дыхательной практики.  ",
    })
    assert response.status_code == 200
    data = response.json()
    assert set(data) == {"id", "user_id", "text", "created_at", "updated_at"}
    assert isinstance(data["id"], int) and data["id"] > 0
    assert data["user_id"] == user.id
    assert data["text"] == "После занятия: 10 минут дыхательной практики."
    assert datetime.fromisoformat(data["created_at"]).utcoffset() == timedelta(hours=3)
    assert data["updated_at"] is None
    saved = client.get(f"/api/v1/notes/{data['id']}", headers=headers)
    assert saved.json() == data


def test_create_note_contract_blank_error(client, auth_headers_factory):
    _, headers = auth_headers_factory()
    before = client.get("/api/v1/notes", headers=headers).json()["meta"]["total"]
    response = client.post("/api/v1/notes", headers=headers, json={"text": "   "})
    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["type"] == "value_error"
    assert error["loc"] == ["body", "text"]
    assert error["msg"] == "Value error, Текст заметки не может быть пустым"
    assert error["input"] == "   "
    after = client.get("/api/v1/notes", headers=headers).json()["meta"]["total"]
    assert after == before


@pytest.mark.parametrize("text, expected", [("а", 200), ("а" * 1000, 200), ("а" * 1001, 422)])
def test_create_note_contract_length_limits(client, auth_headers_factory, text, expected):
    _, headers = auth_headers_factory()
    response = client.post("/api/v1/notes", headers=headers, json={"text": text})
    assert response.status_code == expected
