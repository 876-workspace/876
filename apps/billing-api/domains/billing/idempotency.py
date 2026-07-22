from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import Request

from core.errors import AppHTTPException
from core.security import BillingPrincipal


def integration_create_body(
    request: Request,
    principal: BillingPrincipal,
    payload: dict[str, Any],
) -> dict[str, Any]:
    body = dict(payload)
    source_external_reference = body.pop("sourceExternalReference", None)
    for key in ("sourceAppId", "sourceIdempotencyKey", "sourcePayloadHash"):
        body.pop(key, None)

    if principal.platform_admin:
        if source_external_reference is not None:
            raise AppHTTPException(
                code="validation/invalid-request",
                message="Source external references require a product app credential.",
                http_status_code=422,
            )
        return body

    if not principal.app_id:
        raise AppHTTPException(
            code="auth/app-identity-required",
            message="The product app identity could not be resolved.",
            http_status_code=401,
        )
    if "externalReference" in body:
        raise AppHTTPException(
            code="validation/invalid-request",
            message="Use sourceExternalReference for product app references.",
            http_status_code=422,
        )

    idempotency_key = (request.headers.get("idempotency-key") or "").strip()
    if not idempotency_key or len(idempotency_key) > 255:
        raise AppHTTPException(
            code="billing/idempotency-key-required",
            message="Provide an Idempotency-Key header between 1 and 255 characters.",
            http_status_code=400,
        )
    canonical = canonicalize({"payload": body, "sourceExternalReference": source_external_reference})
    return {
        **body,
        "sourceAppId": principal.app_id,
        "sourceExternalReference": source_external_reference,
        "sourceIdempotencyKey": idempotency_key,
        "sourcePayloadHash": hashlib.sha256(canonical.encode()).hexdigest(),
    }


def canonicalize(value: Any) -> str:
    """Match the canonical payload representation used by the TypeScript API."""

    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean:true" if value else "boolean:false"
    if isinstance(value, str):
        return f"string:{json.dumps(value, separators=(',', ':'))}"
    if isinstance(value, (int, float)):
        return f"number:{value}"
    if isinstance(value, list):
        return f"array:[{','.join(canonicalize(item) for item in value)}]"
    if isinstance(value, dict):
        members = ",".join(f"{json.dumps(key)}:{canonicalize(value[key])}" for key in sorted(value))
        return f"object:{{{members}}}"
    raise AppHTTPException(
        code="validation/invalid-request",
        message="The integration payload contains an unsupported value.",
        http_status_code=422,
    )
