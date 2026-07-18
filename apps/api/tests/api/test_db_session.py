from __future__ import annotations

from typing import Any

import pytest

import db.session as db_session
from db.session import get_db


class _SpySession:
    """Minimal stand-in for an AsyncSession that records commit/rollback.

    Mirrors the async-context-manager protocol used by ``get_db`` so we can
    assert the request session's unit-of-work behaviour without a real engine.
    """

    def __init__(self) -> None:
        self.committed = False
        self.rolled_back = False

    async def __aenter__(self) -> _SpySession:
        return self

    async def __aexit__(self, *exc_info: Any) -> bool:
        return False

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        self.rolled_back = True


class _SpyMaker:
    def __init__(self) -> None:
        self.session = _SpySession()

    def __call__(self) -> _SpySession:
        return self.session


# Regression guard for the missing request-session commit. Authorization codes
# (and every other request-path write) are created with ``add`` + ``flush`` but
# only persist if the session is committed before it closes. Without the commit,
# the OAuth token exchange can never find the code it just issued, surfacing as
# ``invalid_grant`` / "Sign-in paused" in Console. The OAuth suite uses
# an in-memory MockSession that cannot catch this, so we assert the real
# ``get_db`` contract directly.


async def test_get_db_commits_on_success(monkeypatch: pytest.MonkeyPatch) -> None:
    maker = _SpyMaker()
    monkeypatch.setattr(db_session, "AsyncSessionLocal", maker)

    agen = get_db()
    await agen.__anext__()

    with pytest.raises(StopAsyncIteration):
        await agen.__anext__()

    assert maker.session.committed is True
    assert maker.session.rolled_back is False


async def test_get_db_rolls_back_on_error(monkeypatch: pytest.MonkeyPatch) -> None:
    maker = _SpyMaker()
    monkeypatch.setattr(db_session, "AsyncSessionLocal", maker)

    agen = get_db()
    await agen.__anext__()

    with pytest.raises(ValueError):
        await agen.athrow(ValueError("boom"))

    assert maker.session.committed is False
    assert maker.session.rolled_back is True
