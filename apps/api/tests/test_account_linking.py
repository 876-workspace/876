"""Unit tests for verified-email account linking in UserRepository.ensure_from_workos.

A user who already has an account (e.g. email+password) and later returns via a
social connection with the same email must resolve to the SAME canonical account
— never a duplicate — and only when the provider asserts the email is verified.
"""

from types import SimpleNamespace
from typing import Any

import pytest

from core.errors import AppHTTPException
from db.repositories.users import UserRepository


class _WorkosUser:
    def __init__(
        self,
        *,
        id: str,
        email: str,
        email_verified: bool,
        first_name: str | None = None,
        last_name: str | None = None,
        avatar: str | None = None,
    ) -> None:
        self.id = id
        self.email = email
        self.email_verified = email_verified
        self.first_name = first_name
        self.last_name = last_name
        self.avatar = avatar


def _repo() -> UserRepository:
    # ensure_from_workos's link/conflict branches never touch self.db, so an
    # uninitialized instance is sufficient.
    return UserRepository.__new__(UserRepository)


async def test_links_verified_social_to_existing_email(monkeypatch: Any) -> None:
    existing = SimpleNamespace(id="876_existing", first_name="Jane", last_name="Doe", avatar=None, deleted_at=None)
    captured: dict[str, Any] = {}

    async def fake_get_by_workos_id(self: UserRepository, wid: str, include_deleted: bool = False) -> Any:
        return None

    async def fake_get_by_email(self: UserRepository, email: str, include_deleted: bool = False) -> Any:
        assert email == "jane@example.com"
        return existing

    async def fake_update(self: UserRepository, user_id: str, **kwargs: Any) -> Any:
        captured["user_id"] = user_id
        captured.update(kwargs)
        return SimpleNamespace(id=user_id, **kwargs)

    monkeypatch.setattr(UserRepository, "get_by_workos_id", fake_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "get_by_email", fake_get_by_email)
    monkeypatch.setattr(UserRepository, "update", fake_update)

    result = await _repo().ensure_from_workos(
        _WorkosUser(
            id="user_NEWGOOGLECONNECTION",
            email="Jane@Example.com",
            email_verified=True,
            first_name="Jane",
        )
    )

    # Linked onto the existing canonical account, adopting the new connection id.
    assert captured["user_id"] == "876_existing"
    assert captured["workos_user_id"] == "user_NEWGOOGLECONNECTION"
    assert captured["email_verified"] is True
    assert result.id == "876_existing"


async def test_rejects_unverified_social_for_existing_email(monkeypatch: Any) -> None:
    existing = SimpleNamespace(id="876_existing", first_name="Jane", last_name="Doe", avatar=None, deleted_at=None)

    async def fake_get_by_workos_id(self: UserRepository, wid: str, include_deleted: bool = False) -> Any:
        return None

    async def fake_get_by_email(self: UserRepository, email: str, include_deleted: bool = False) -> Any:
        return existing

    monkeypatch.setattr(UserRepository, "get_by_workos_id", fake_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "get_by_email", fake_get_by_email)

    with pytest.raises(AppHTTPException) as exc:
        await _repo().ensure_from_workos(
            _WorkosUser(
                id="user_UNVERIFIED",
                email="jane@example.com",
                email_verified=False,
            )
        )

    assert exc.value.app_code == "auth/email-already-registered"
    assert exc.value.status_code == 409


# ── deleted accounts ──────────────────────────────────────────────────────────
#
# Deleting a user now deletes the WorkOS user too, so a tombstoned account
# normally has no credentials left to sign in with. These cover the accounts
# deleted before that landed, whose provider users still exist: the tombstone
# must refuse the session rather than fall through to the create branch and
# collide with its own row on the `users.email` unique index.


async def test_rejects_a_tombstoned_account_matched_by_workos_id(monkeypatch: Any) -> None:
    tombstone = SimpleNamespace(id="876_deleted", deleted_at=1700000000)

    async def fake_get_by_workos_id(self: UserRepository, wid: str, include_deleted: bool = False) -> Any:
        assert include_deleted is True
        return tombstone

    async def fail_create(self: UserRepository, **kwargs: Any) -> Any:
        raise AssertionError("a deleted account must never be recreated")

    monkeypatch.setattr(UserRepository, "get_by_workos_id", fake_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "create", fail_create)

    with pytest.raises(AppHTTPException) as exc:
        await _repo().ensure_from_workos(_WorkosUser(id="user_DELETED", email="jane@example.com", email_verified=True))

    assert exc.value.app_code == "auth/account-deleted"
    assert exc.value.status_code == 403


async def test_rejects_a_tombstoned_account_matched_by_email(monkeypatch: Any) -> None:
    """A recreated WorkOS user carries a new id, so the email is the only link."""
    tombstone = SimpleNamespace(id="876_deleted", deleted_at=1700000000)

    async def fake_get_by_workos_id(self: UserRepository, wid: str, include_deleted: bool = False) -> Any:
        return None

    async def fake_get_by_email(self: UserRepository, email: str, include_deleted: bool = False) -> Any:
        assert include_deleted is True
        return tombstone

    async def fail_create(self: UserRepository, **kwargs: Any) -> Any:
        raise AssertionError("a deleted account must never be recreated")

    monkeypatch.setattr(UserRepository, "get_by_workos_id", fake_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "get_by_email", fake_get_by_email)
    monkeypatch.setattr(UserRepository, "create", fail_create)

    with pytest.raises(AppHTTPException) as exc:
        await _repo().ensure_from_workos(
            _WorkosUser(id="user_RECREATED", email="jane@example.com", email_verified=True)
        )

    assert exc.value.app_code == "auth/account-deleted"
    assert exc.value.status_code == 403
