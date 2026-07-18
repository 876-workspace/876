import hashlib
import re
import secrets
from urllib.parse import urlparse


def generate_client_id() -> str:
    return f"876_client_{secrets.token_urlsafe(16)}"


def generate_client_secret() -> str:
    return f"876_cs_{secrets.token_urlsafe(32)}"


def hash_client_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def slugify_registered_app_name(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s[:80]


def is_localhost(hostname: str) -> bool:
    return hostname in ("localhost", "127.0.0.1", "::1")


def generate_api_key() -> str:
    return f"876_app_secret_{secrets.token_urlsafe(32)}"


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def is_redirect_uri_safe(uri: str) -> bool:
    try:
        parsed = urlparse(uri)
        if parsed.scheme == "https":
            return True
        return parsed.scheme == "http" and is_localhost(parsed.hostname or "")
    except Exception:
        return False
