from datetime import datetime, timedelta, timezone

import pytest


@pytest.mark.parametrize("rate,minutes,kind,expected", [
    (1500, 30, "individual", 750),
    (1500, 60, "individual", 1500),
    (1500, 90, "individual", 2250),
    (1500, 90, "group", 1575),
    (1501, 30, "individual", 751),
    (1010, 30, "group", 354),
    (1500, 45, "individual", 1125),
])
def test_api_persists_price_calculated_by_server(client, auth_headers_factory, mentor_factory,
                                                rate, minutes, kind, expected):
    _, headers = auth_headers_factory()
    _, mentor = mentor_factory(price=rate)
    response = client.post("/api/v1/bookings", headers=headers, json={
        "mentor_id": mentor.id,
        "session_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "duration_minutes": minutes,
        "session_type": kind,
        "price": 1,  # Client-supplied totals must not override the server.
    })
    assert response.status_code == 200, response.text
    booking = response.json()
    assert booking["price"] == expected
    saved = client.get(f"/api/v1/bookings/{booking['id']}", headers=headers)
    assert saved.json()["price"] == expected


def test_edit_recalculates_duration_and_type_but_not_date(client, auth_headers_factory,
                                                         mentor_factory, db_session):
    _, headers = auth_headers_factory()
    _, mentor = mentor_factory(price=1500)
    response = client.post("/api/v1/bookings", headers=headers, json={
        "mentor_id": mentor.id,
        "session_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "duration_minutes": 60,
    })
    assert response.status_code == 200
    path = f"/api/v1/bookings/{response.json()['id']}"
    for payload, expected in [
        ({"session_type": "group"}, 1050),
        ({"duration_minutes": 90}, 1575),
        ({"session_type": "individual"}, 2250),
    ]:
        result = client.put(path, headers=headers, json=payload)
        assert result.status_code == 200, result.text
        assert result.json()["price"] == expected
    mentor.price = 3000
    db_session.commit()
    result = client.put(path, headers=headers, json={
        "session_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "notes": "Новое время",
    })
    assert result.status_code == 200, result.text
    assert result.json()["price"] == 2250
