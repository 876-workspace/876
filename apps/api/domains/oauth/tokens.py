from __future__ import annotations

import base64
import hashlib
import secrets
from typing import Any

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from core.logging import get_logger

logger = get_logger(__name__)

_fallback_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

_cached_private_key = None
_cached_public_key = None


def get_private_key(settings: Any) -> rsa.RSAPrivateKey:
    global _cached_private_key
    if _cached_private_key is not None:
        return _cached_private_key

    configured_key = settings.oauth_private_key
    if not configured_key:
        # The fallback key is generated fresh per process: every instance and
        # every restart would sign with a different key, and the JWKS would
        # publish a key nobody else can verify against. Acceptable for local
        # dev only — refuse to mint forgeable/unverifiable tokens in prod.
        if settings.is_production:
            raise RuntimeError(
                "OAUTH_PRIVATE_KEY must be configured in production; "
                "refusing to sign tokens with an ephemeral in-process key."
            )
        _cached_private_key = _fallback_private_key
        return _cached_private_key

    key_pem = configured_key.replace("\\n", "\n").strip()
    loaded_key = serialization.load_pem_private_key(key_pem.encode("utf-8"), password=None)
    if not isinstance(loaded_key, rsa.RSAPrivateKey):
        raise ValueError("Invalid RSA private key type")

    _cached_private_key = loaded_key
    return _cached_private_key


def get_public_key(settings: Any) -> rsa.RSAPublicKey:
    global _cached_public_key
    if _cached_public_key is not None:
        return _cached_public_key

    private_key = get_private_key(settings)
    _cached_public_key = private_key.public_key()
    return _cached_public_key


def get_provider_key_id(settings: Any) -> str:
    if settings.oauth_key_id:
        return str(settings.oauth_key_id)

    public_key_der = get_public_key(settings).public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    fingerprint = hashlib.sha256(public_key_der).hexdigest()[:16]
    return f"876-{fingerprint}"


def int_to_base64url(val: int) -> str:
    byte_len = (val.bit_length() + 7) // 8
    val_bytes = val.to_bytes(byte_len, byteorder="big")
    return base64.urlsafe_b64encode(val_bytes).decode("utf-8").rstrip("=")


def get_provider_jwk(settings: Any) -> dict[str, Any]:
    public_key = get_public_key(settings)
    public_numbers = public_key.public_numbers()

    return {
        "kty": "RSA",
        "n": int_to_base64url(public_numbers.n),
        "e": int_to_base64url(public_numbers.e),
        "alg": "RS256",
        "kid": get_provider_key_id(settings),
        "use": "sig",
    }


def sha256_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_base64url(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def generate_provider_token(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(32)}"


def sign_provider_jwt(claims: dict[str, Any], settings: Any) -> str:
    private_key = get_private_key(settings)
    headers = {
        "alg": "RS256",
        "kid": get_provider_key_id(settings),
        "typ": "JWT",
    }
    return jwt.encode(claims, private_key, algorithm="RS256", headers=headers)


def verify_provider_jwt(token: str, settings: Any) -> dict[str, Any] | None:
    public_key = get_public_key(settings)
    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False, "verify_iss": False, "verify_exp": True},
        )
        return claims
    except jwt.ExpiredSignatureError:
        logger.debug("oauth.jwt.expired")
        return None
    except jwt.InvalidTokenError:
        logger.debug("oauth.jwt.invalid")
        return None
    except Exception:
        logger.error("oauth.jwt.verify_error", exc_info=True)
        return None
