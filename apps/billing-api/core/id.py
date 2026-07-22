import secrets


def generate_request_id() -> str:
    return f"req_{secrets.token_urlsafe(18)}"
