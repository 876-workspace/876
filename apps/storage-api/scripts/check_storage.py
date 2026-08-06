from __future__ import annotations

import argparse
import struct
import zlib
from typing import Any

import httpx

from core.config import get_settings


def generated_png() -> bytes:
    signature = b"\x89PNG\r\n\x1a\n"

    def chunk(kind: bytes, data: bytes) -> bytes:
        payload = kind + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)
    pixel = zlib.compress(b"\x00\x4c\x85\xf5\xff")
    return signature + chunk(b"IHDR", header) + chunk(b"IDAT", pixel) + chunk(b"IEND", b"")


def expect_json(response: httpx.Response, expected_status: int) -> dict[str, Any]:
    if response.status_code != expected_status:
        raise RuntimeError(f"Storage API returned HTTP {response.status_code}.")
    payload = response.json()
    if not isinstance(payload, dict):
        raise RuntimeError("Storage API returned a non-object response.")
    return payload


def run(base_url: str, internal_key: str, owner_id: str, actor_user_id: str, source_app_id: str) -> None:
    image = generated_png()
    headers = {"x-internal-key": internal_key}
    # The files domain authorizes the principal a caller acts for, not just the
    # service key. The checker owns the file it creates, so it asserts exactly
    # the owner and actor it opened the upload session with.
    file_headers = {
        **headers,
        "x-876-source-app-id": source_app_id,
        "x-876-actor-user-id": actor_user_id,
        "x-876-actor-org-id": owner_id,
    }
    with httpx.Client(timeout=30.0) as client:
        print("1. Sign: opening organization.primaryLogo upload session")
        opened = expect_json(
            client.post(
                f"{base_url}/v1/uploads",
                headers=headers,
                json={
                    "route_key": "organization.primaryLogo",
                    "owner_type": "organization",
                    "owner_id": owner_id,
                    "actor_user_id": actor_user_id,
                    "source_app_id": source_app_id,
                    "file_name": "storage-check.png",
                    "content_type": "image/png",
                    "size_bytes": len(image),
                },
            ),
            201,
        )

        print("2. PUT: uploading generated PNG directly to R2")
        upload_response = client.put(
            str(opened["upload_url"]),
            headers={str(key): str(value) for key, value in dict(opened["headers"]).items()},
            content=image,
        )
        upload_response.raise_for_status()

        print("3. HEAD: completing upload so Storage verifies the object")
        file_payload = expect_json(
            client.post(
                f"{base_url}/v1/uploads/{opened['id']}/complete",
                headers=headers,
                json={},
            ),
            200,
        )
        if file_payload.get("status") != "ready":
            raise RuntimeError("Storage did not mark the file ready.")

        print("4. Read URL: minting and fetching the file")
        read_payload = expect_json(
            client.post(
                f"{base_url}/v1/files/{opened['file_id']}/read-url",
                headers=file_headers,
                json={"expires_in": 300},
            ),
            200,
        )
        read_response = client.get(str(read_payload["url"]))
        read_response.raise_for_status()
        if read_response.content != image:
            raise RuntimeError("Read bytes did not match uploaded bytes.")

        print("5. Delete: soft-deleting file metadata")
        deleted = expect_json(
            client.delete(f"{base_url}/v1/files/{opened['file_id']}", headers=file_headers),
            200,
        )
        if deleted != {"object": "file", "id": opened["file_id"], "deleted": True}:
            raise RuntimeError("Storage returned an unexpected deletion tombstone.")
        print("Storage round-trip passed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Round-trip a generated PNG through 876 Storage and R2.")
    parser.add_argument("--base-url", default="http://127.0.0.1:4005")
    parser.add_argument("--owner-id", default="org_storage_check")
    parser.add_argument("--actor-user-id", default="user_storage_check")
    parser.add_argument("--source-app-id", default="876-storage-check")
    args = parser.parse_args()
    internal_key = get_settings().internal_key
    if not internal_key:
        raise RuntimeError("STORAGE_INTERNAL_KEY is required.")
    run(
        args.base_url.rstrip("/"),
        internal_key,
        args.owner_id,
        args.actor_user_id,
        args.source_app_id,
    )


if __name__ == "__main__":
    main()
