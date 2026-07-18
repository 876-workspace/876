import hashlib

import pytest

from core.errors import AppHTTPException
from core.security import require_api_key


class _State:
    app_id: str | None = None
    api_key_id: str | None = None


class _Request:
    state = _State()


class _ApiKeyRow:
    id = "key_test"
    app_id = "app_test"
    revoked = False
    expires_at = None
    last_used_at = None


class _ScalarResult:
    def __init__(self, row: _ApiKeyRow | None) -> None:
        self.row = row

    def first(self) -> _ApiKeyRow | None:
        return self.row


class _Db:
    def __init__(self, row: _ApiKeyRow | None) -> None:
        self.row = row
        self.flushed = False

    async def scalars(self, _stmt):
        return _ScalarResult(self.row)

    async def flush(self) -> None:
        self.flushed = True


async def test_require_api_key_rejects_missing_key() -> None:
    request = _Request()

    with pytest.raises(AppHTTPException) as exc:
        await require_api_key(request, None, _Db(None))

    assert exc.value.app_code == "api-key/missing"


async def test_require_api_key_rejects_malformed_key() -> None:
    request = _Request()

    with pytest.raises(AppHTTPException) as exc:
        await require_api_key(request, "bad_key", _Db(None))

    assert exc.value.app_code == "api-key/invalid"


async def test_require_api_key_attaches_app_identity() -> None:
    request = _Request()
    db = _Db(_ApiKeyRow())

    result = await require_api_key(request, "876_app_secret_test_key", db)

    assert result is True
    assert request.state.app_id == "app_test"
    assert request.state.api_key_id == "key_test"
    assert db.flushed is True


async def test_require_api_key_rejects_unknown_key() -> None:
    request = _Request()
    key_hash = hashlib.sha256(b"876_app_secret_unknown").hexdigest()

    with pytest.raises(AppHTTPException) as exc:
        await require_api_key(request, f"876_app_secret_{key_hash}", _Db(None))

    assert exc.value.app_code == "api-key/invalid"
