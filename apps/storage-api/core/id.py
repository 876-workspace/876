import secrets

ENTITY_PREFIXES = {
    "file": "file",
    "storage_quota": "squota",
    "upload_session": "upl",
    "version": "ver",
}


def generate_id(entity_type: str) -> str:
    prefix = ENTITY_PREFIXES.get(entity_type)
    if prefix is None:
        raise ValueError(f"Unknown entity type: {entity_type}")
    return f"{prefix}_{secrets.token_urlsafe(18)}"


def generate_request_id() -> str:
    return f"req_{secrets.token_urlsafe(18)}"
