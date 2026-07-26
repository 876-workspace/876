import hashlib
import hmac
from typing import Annotated

from fastapi import Header, Request, status

from core.errors import AppHTTPException


def _secret_matches(presented: str, expected: str) -> bool:
    presented_digest = hashlib.sha256(presented.encode()).digest()
    expected_digest = hashlib.sha256(expected.encode()).digest()
    return hmac.compare_digest(presented_digest, expected_digest)


async def require_internal_key(
    request: Request,
    x_internal_key: Annotated[str | None, Header(include_in_schema=False)] = None,
) -> None:
    configured = request.app.state.settings.internal_key
    if not configured or not x_internal_key or not _secret_matches(x_internal_key, configured):
        raise AppHTTPException(
            code="storage/unauthorized",
            message="The storage service credential is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
