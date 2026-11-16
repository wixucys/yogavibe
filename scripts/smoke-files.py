"""Check real upload, signed download, deletion and access denial after deletion.

Run on the host: python3 scripts/smoke-files.py http://localhost
Leaves a unique smoke user; removes its test attachment.
"""
import base64
import json
import sys
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost").rstrip("/")


def request(path, body=None, token=None, method=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    with urlopen(Request(BASE + path, data=data, headers=headers, method=method), timeout=20) as response:
        return json.load(response)


def main():
    suffix = uuid.uuid4().hex[:12]
    auth = request("/api/v1/auth/register", {
        "username": f"files_{suffix}",
        "email": f"files_{suffix}@example.com",
        "password": uuid.uuid4().hex,
    })
    token = auth["access_token"]
    content = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=")
    saved = request("/api/v1/users/me/files", {
        "filename": "smoke.png", "mime_type": "image/png", "category": "avatar",
        "content_base64": base64.b64encode(content).decode(),
    }, token)
    try:
        access = request(f"/api/v1/files/{saved['id']}/download-url", token=token)
        url = access["url"]
        with urlopen(url, timeout=20) as response:
            assert response.read() == content, "Downloaded bytes differ"
        print("OK: uploaded file and downloaded identical bytes using signed URL")
    finally:
        request(f"/api/v1/users/me/files/{saved['id']}", token=token, method="DELETE")
    try:
        with urlopen(url, timeout=20):
            raise AssertionError("Deleted file is still accessible")
    except HTTPError as exc:
        assert exc.code in (403, 404), exc.code
    print("OK: deleted attachment is no longer accessible")


if __name__ == "__main__":
    main()
