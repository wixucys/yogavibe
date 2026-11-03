"""Three-step smoke check against a running stack (stdlib only).

Run inside backend: python /tmp/smoke.py http://nginx
Creates one uniquely named test user; creates and removes its test note.
"""
import json
import sys
import uuid
from urllib.request import Request, urlopen

base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost").rstrip("/")


def request(path, body=None, token=None, method=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    with urlopen(Request(base + path, data=data, headers=headers, method=method), timeout=15) as response:
        payload = response.read()
        if "application/json" in response.headers.get("Content-Type", ""):
            return json.loads(payload)
        return payload.decode()


def main():
    assert request("/api/health")["status"] == "ok"
    assert "healthy" in request("/health")
    assert '<div id="root">' in request("/")
    print("1/3 OK: frontend, proxy and API respond")

    suffix = uuid.uuid4().hex[:12]
    auth = request("/api/v1/auth/register", {
        "username": f"smoke_{suffix}",
        "email": f"smoke_{suffix}@example.com",
        "password": uuid.uuid4().hex,
    })
    token = auth["access_token"]
    me = request("/api/v1/users/me", token=token)
    assert me["id"] == auth["user"]["id"]
    print("2/3 OK: registration and authenticated profile")

    mentors = request("/api/v1/mentors", token=token)
    assert isinstance(mentors["items"], list)
    note = request("/api/v1/notes", {"text": f"Smoke {suffix}"}, token)
    try:
        saved = request(f"/api/v1/notes/{note['id']}", token=token)
        assert saved["text"] == f"Smoke {suffix}"
    finally:
        request(f"/api/v1/notes/{note['id']}", token=token, method="DELETE")
    print("3/3 OK: mentor catalog and saved note; test note removed")


if __name__ == "__main__":
    main()
