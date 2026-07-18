import json
from typing import Any, cast

import httpx
from jwt import PyJWKClient, PyJWTError

from core.logging import get_logger

logger = get_logger(__name__)


def _fetch_jwks(jwks_url: str) -> list[dict[str, Any]]:
    resp = httpx.get(jwks_url, timeout=10)
    resp.raise_for_status()
    return cast(list[dict[str, Any]], resp.json().get("keys", []))


def verify_workos_token(token: str, jwks_url: str) -> dict[str, Any] | None:
    """Verify a WorkOS access token against the JWKS endpoint.

    Returns the decoded payload on success, or None if verification fails.
    """
    try:
        client = PyJWKClient(jwks_url, cache_keys=True)
        signing_key = client.get_signing_key_from_jwt(token)
        from jwt import decode as jwt_decode

        payload = jwt_decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        if isinstance(payload, dict):
            return payload
        return None
    except httpx.HTTPError:
        logger.error("workos.jwks.fetch_failed", jwks_url=jwks_url, exc_info=True)
        return None
    except (PyJWTError, json.JSONDecodeError, IndexError) as exc:
        logger.warning("workos.jwks.verify_failed", jwks_url=jwks_url, error_type=type(exc).__name__)
        return None
