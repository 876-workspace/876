from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from typing import Any, TypeVar, cast

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import Table, create_engine, inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from core.config import Settings
from core.errors import AppHTTPException
from core.rate_limit import reset_rate_limits
from core.security import Principal, require_api_key, require_session
from core.timestamps import now_unix_seconds
from db.models import AuditEvent, Base, User, UserMobileNumber, Verification
from db.repositories.mobile_numbers import MobileNumberRepository
from db.session import get_db
from domains.mobile_numbers.service import MobileNumberService, normalize_phone_number
from main import create_app
from providers.twilio import get_phone_verification_provider
from providers.twilio.fake import FakeTwilioProvider

_Model = TypeVar("_Model")


class _AsyncSqliteSession:
    """Async-shaped adapter for a private, local SQLite test session.

    The production repository is async, while these integration tests must stay
    hermetic (including no network database).  This adapter keeps the real ORM,
    SQL, transactions, and constraints under test without adding a test-only
    driver dependency.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, row: Any) -> None:
        self._session.add(row)

    async def commit(self) -> None:
        self._session.commit()

    async def delete(self, row: Any) -> None:
        self._session.delete(row)

    async def execute(self, statement: Any) -> Any:
        return self._session.execute(statement)

    async def flush(self) -> None:
        self._session.flush()

    async def get(self, model: type[_Model], identity: str) -> _Model | None:
        return cast(_Model | None, self._session.get(model, identity))

    async def refresh(self, row: Any) -> None:
        self._session.refresh(row)

    async def rollback(self) -> None:
        self._session.rollback()

    async def scalars(self, statement: Any) -> Any:
        return self._session.scalars(statement)


class _MobileNumberTestContext:
    def __init__(self, db: _AsyncSqliteSession, app: Any, principal: dict[str, str]) -> None:
        self.db = db
        self.app = app
        self._principal = principal

    def client_for(self, user_id: str) -> AsyncClient:
        self._principal["user_id"] = user_id
        return AsyncClient(
            transport=ASGITransport(app=self.app, raise_app_exceptions=False),
            base_url="http://testserver",
        )


def _user(user_id: str) -> User:
    now = now_unix_seconds()
    return User(
        id=user_id,
        workos_user_id=f"workos_{user_id}",
        email=f"{user_id}@example.test",
        first_name="Test",
        last_name="User",
        phone_verified=False,
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def mobile_number_context(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[_MobileNumberTestContext]:
    """A real, isolated database plus the normal ASGI route/dependency path."""
    engine = create_engine(f"sqlite:///{tmp_path / 'mobile-numbers.sqlite3'}")
    tables = cast(
        list[Table],
        [User.__table__, Verification.__table__, UserMobileNumber.__table__, AuditEvent.__table__],
    )
    Base.metadata.create_all(engine, tables=tables)
    with engine.begin() as connection:
        # SQLAlchemy's PostgreSQL-only predicate is intentionally absent from
        # SQLite DDL. Install the equivalent local index so the constraint is
        # exercised by a real database transaction in this hermetic suite.
        connection.exec_driver_sql("DROP INDEX IF EXISTS uq_user_mobile_numbers_primary_per_user")
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX uq_user_mobile_numbers_primary_per_user "
            "ON user_mobile_numbers (user_id) WHERE is_primary = 1"
        )

    session = sessionmaker(bind=engine, expire_on_commit=False)()
    db = _AsyncSqliteSession(session)
    session.add_all([_user("usr_a"), _user("usr_b")])
    session.commit()

    settings = Settings(twilio_mode="fake", twilio_verify_sms_enabled=True)
    monkeypatch.setattr("domains.mobile_numbers.service.get_settings", lambda: settings)
    principal = {"user_id": "usr_a"}
    app = create_app(settings)

    async def test_db() -> AsyncIterator[_AsyncSqliteSession]:
        try:
            yield db
            await db.commit()
        except BaseException:
            await db.rollback()
            raise

    app.dependency_overrides[get_db] = test_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id=principal["user_id"])
    yield _MobileNumberTestContext(db, app, principal)

    session.close()
    engine.dispose()


def _data(response: Any) -> dict[str, Any]:
    assert response.status_code in {200, 201}, response.text
    return cast(dict[str, Any], response.json()["data"])


def _assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code, response.text
    assert response.json()["error"]["code"] == code


async def _create_number(client: AsyncClient, number: str) -> dict[str, Any]:
    return _data(await client.post("/users/me/mobile-numbers", json={"number": number, "type": "mobile"}))


async def _send(client: AsyncClient, mobile_number_id: str) -> dict[str, Any]:
    return _data(
        await client.post(f"/users/me/mobile-numbers/{mobile_number_id}/verifications", json={"channel": "sms"})
    )


async def _approve(
    client: AsyncClient,
    mobile_number_id: str,
    verification_id: str,
    *,
    make_primary: bool = False,
    code: str = "000000",
) -> Any:
    return await client.post(
        f"/users/me/mobile-numbers/{mobile_number_id}/verifications/{verification_id}/approve",
        json={"code": code, "makePrimary": make_primary},
    )


async def _verification(ctx: _MobileNumberTestContext, verification_id: str) -> Verification:
    row = await ctx.db.get(Verification, verification_id)
    assert row is not None
    await ctx.db.refresh(row)
    return row


async def _mobile_number(ctx: _MobileNumberTestContext, mobile_number_id: str) -> UserMobileNumber | None:
    row = await ctx.db.get(UserMobileNumber, mobile_number_id)
    if row is not None:
        await ctx.db.refresh(row)
    return row


async def _make_resendable(ctx: _MobileNumberTestContext, verification_id: str) -> None:
    row = await _verification(ctx, verification_id)
    row.can_resend_at = now_unix_seconds() - 1
    await ctx.db.commit()


def test_e164_normalization_matches_client_compatible_international_input() -> None:
    assert normalize_phone_number("+1 (876) 555-0100") == "+18765550100"
    with pytest.raises(AppHTTPException) as exc_info:
        normalize_phone_number("8765550100")
    assert exc_info.value.app_code == "communications/invalid-phone-number"


@pytest.mark.asyncio
async def test_fake_provider_is_deterministic_and_never_persists_code() -> None:
    provider = FakeTwilioProvider()
    created = await provider.create_verification(to_number="+18765550100", channel="sms")
    approved = await provider.approve_verification(to_number="+18765550100", code="000000")
    failed = await provider.approve_verification(to_number="+18765550100", code="111111")

    assert created.provider_sid.startswith("fake_")
    assert approved.status == "approved"
    assert failed.status == "pending"
    assert "000000" not in repr(created)


@pytest.mark.asyncio
async def test_disabled_mode_fails_closed_before_provider_usage() -> None:
    settings = Settings(
        twilio_mode="disabled",
        twilio_verify_sms_enabled=False,
    )
    provider = get_phone_verification_provider(settings)

    with pytest.raises(AppHTTPException) as exc_info:
        await provider.create_verification(to_number="+18765550100", channel="sms")
    assert exc_info.value.app_code == "communications/not-configured"


def test_email_otp_table_remains_a_distinct_model() -> None:
    from db.models import AuthEmailOtpChallenge, Verification

    assert AuthEmailOtpChallenge.__tablename__ == "auth_email_otps"
    assert Verification.__tablename__ == "verifications"


def test_disabled_channel_is_rejected_before_provider_call() -> None:
    service = MobileNumberService.__new__(MobileNumberService)
    service._settings = Settings(twilio_mode="fake", twilio_verify_sms_enabled=False)

    with pytest.raises(AppHTTPException) as exc_info:
        service._require_channel("sms")
    assert exc_info.value.app_code == "communications/channel-disabled"


async def test_other_user_cannot_access_or_mutate_a_mobile_number(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as user_a:
        number = await _create_number(user_a, "+18765550101")
        verification = await _send(user_a, number["id"])

    async with mobile_number_context.client_for("usr_b") as user_b:
        responses = [
            await user_b.get(f"/users/me/mobile-numbers/{number['id']}"),
            await user_b.patch(f"/users/me/mobile-numbers/{number['id']}", json={"type": "work"}),
            await user_b.delete(f"/users/me/mobile-numbers/{number['id']}"),
            await user_b.post(f"/users/me/mobile-numbers/{number['id']}/make-primary"),
            await user_b.post(
                f"/users/me/mobile-numbers/{number['id']}/verifications", json={"channel": "sms"}
            ),
            await _approve(user_b, number["id"], verification["id"]),
        ]

    for response in responses:
        _assert_error(response, 404, "communications/invalid-phone-number")

    row = await _mobile_number(mobile_number_context, number["id"])
    assert row is not None
    assert (row.user_id, row.type, row.verification_id, row.is_primary) == (
        "usr_a",
        "mobile",
        verification["id"],
        False,
    )
    assert await mobile_number_context.db.get(Verification, verification["id"]) is not None


async def test_approval_rejects_another_number_verification_for_the_same_user(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        first = await _create_number(client, "+18765550102")
        second = await _create_number(client, "+18765550103")
        first_verification = await _send(client, first["id"])
        await _send(client, second["id"])
        response = await _approve(client, second["id"], first_verification["id"])

    _assert_error(response, 404, "communications/verification-failed")
    second_row = await _mobile_number(mobile_number_context, second["id"])
    assert second_row is not None
    assert second_row.verification_status == "pending"
    assert second_row.verified_at is None


async def test_later_primary_approval_moves_the_user_phone_projection(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        first = await _create_number(client, "+18765550104")
        second = await _create_number(client, "+18765550105")
        first_verification = await _send(client, first["id"])
        second_verification = await _send(client, second["id"])
        _data(await _approve(client, first["id"], first_verification["id"], make_primary=True))
        first_row = await _verification(mobile_number_context, first_verification["id"])
        for column in inspect(Verification).column_attrs:
            assert "000000" not in str(getattr(first_row, column.key))
        approved_events = list(
            (await mobile_number_context.db.scalars(
                select(AuditEvent).where(AuditEvent.event == "mobile_number.verification_approved")
            )).all()
        )
        assert len(approved_events) == 1
        assert "000000" not in str(approved_events[0].properties)
        _data(await _approve(client, second["id"], second_verification["id"], make_primary=True))
        listed = _data(await client.get("/users/me/mobile-numbers"))["data"]

    primary_rows = [row for row in listed if row["is_primary"]]
    assert [row["id"] for row in primary_rows] == [second["id"]]
    user = await mobile_number_context.db.get(User, "usr_a")
    assert user is not None
    assert (user.phone, user.phone_verified) == (second["number"], True)
    repository = MobileNumberRepository(mobile_number_context.db)  # type: ignore[arg-type]
    now = now_unix_seconds()
    await repository.create(
        id="mobile_direct_one",
        user_id="usr_b",
        number="+18765550106",
        type="mobile",
        is_primary=True,
        verification_status="verified",
        created_at=now,
        updated_at=now,
    )
    await mobile_number_context.db.commit()

    with pytest.raises(IntegrityError):
        await repository.create(
            id="mobile_direct_two",
            user_id="usr_b",
            number="+18765550107",
            type="mobile",
            is_primary=True,
            verification_status="verified",
            created_at=now,
            updated_at=now,
        )
    await mobile_number_context.db.rollback()


async def test_deleting_a_primary_number_clears_the_user_phone_projection(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550108")
        verification = await _send(client, number["id"])
        _data(await _approve(client, number["id"], verification["id"], make_primary=True))
        response = await client.delete(f"/users/me/mobile-numbers/{number['id']}")

    _data(response)
    assert await _mobile_number(mobile_number_context, number["id"]) is None
    user = await mobile_number_context.db.get(User, "usr_a")
    assert user is not None
    assert (user.phone, user.phone_verified) == (None, False)


async def test_make_primary_rejects_an_unverified_number(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550109")
        response = await client.post(f"/users/me/mobile-numbers/{number['id']}/make-primary")

    _assert_error(response, 400, "communications/number-not-verified")


async def test_resend_inside_the_cooldown_is_pending(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550110")
        await _send(client, number["id"])
        response = await client.post(f"/users/me/mobile-numbers/{number['id']}/verifications", json={"channel": "sms"})

    _assert_error(response, 429, "communications/verification-pending")


async def test_resend_after_cooldown_increments_the_persisted_send_count(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550111")
        first = await _send(client, number["id"])
        await _make_resendable(mobile_number_context, first["id"])
        second = await _send(client, number["id"])

    assert (await _verification(mobile_number_context, second["id"])).metadata_ == {"send_count": 2}


async def test_fifth_send_succeeds_and_sixth_is_rate_limited(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550112")
        verification = await _send(client, number["id"])
        for _ in range(4):
            await _make_resendable(mobile_number_context, verification["id"])
            verification = await _send(client, number["id"])
        await _make_resendable(mobile_number_context, verification["id"])
        response = await client.post(f"/users/me/mobile-numbers/{number['id']}/verifications", json={"channel": "sms"})

    assert (await _verification(mobile_number_context, verification["id"])).metadata_ == {"send_count": 5}
    _assert_error(response, 429, "communications/rate-limited")


async def test_send_count_restarts_after_the_previous_window_expires(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550113")
        first = await _send(client, number["id"])
        previous = await _verification(mobile_number_context, first["id"])
        previous.last_sent_at = now_unix_seconds() - (24 * 60 * 60) - 1
        previous.can_resend_at = now_unix_seconds() - 1
        previous.metadata_ = {"send_count": 5}
        await mobile_number_context.db.commit()
        reset_rate_limits()
        next_verification = await _send(client, number["id"])

    assert (await _verification(mobile_number_context, next_verification["id"])).metadata_ == {"send_count": 1}


async def test_cooldown_rejection_does_not_consume_the_remaining_send_quota(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550114")
        verification = await _send(client, number["id"])
        cooldown_response = await client.post(
            f"/users/me/mobile-numbers/{number['id']}/verifications", json={"channel": "sms"}
        )
        _assert_error(cooldown_response, 429, "communications/verification-pending")

        for _ in range(4):
            await _make_resendable(mobile_number_context, verification["id"])
            verification = await _send(client, number["id"])
        await _make_resendable(mobile_number_context, verification["id"])
        final_response = await client.post(
            f"/users/me/mobile-numbers/{number['id']}/verifications", json={"channel": "sms"}
        )

    assert (await _verification(mobile_number_context, verification["id"])).metadata_ == {"send_count": 5}
    _assert_error(final_response, 429, "communications/rate-limited")


async def test_wrong_codes_increment_attempts_and_the_fifth_fails_the_verification(
    mobile_number_context: _MobileNumberTestContext,
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550115")
        verification = await _send(client, number["id"])
        for attempt in range(1, 5):
            response = await _approve(client, number["id"], verification["id"], code="111111")
            _assert_error(response, 400, "communications/verification-failed")
            assert (await _verification(mobile_number_context, verification["id"])).attempt_count == attempt
        response = await _approve(client, number["id"], verification["id"], code="111111")

    _assert_error(response, 429, "communications/max-attempts-reached")
    final = await _verification(mobile_number_context, verification["id"])
    assert (final.attempt_count, final.status) == (5, "failed")


async def test_expired_verification_is_marked_expired_and_failed_approval_rolls_back(
    mobile_number_context: _MobileNumberTestContext, monkeypatch: pytest.MonkeyPatch
) -> None:
    async with mobile_number_context.client_for("usr_a") as client:
        number = await _create_number(client, "+18765550116")
        verification = await _send(client, number["id"])
        row = await _verification(mobile_number_context, verification["id"])
        row.expires_at = now_unix_seconds() - 1
        await mobile_number_context.db.commit()
        response = await _approve(client, number["id"], verification["id"])

    _assert_error(response, 400, "communications/verification-expired")
    assert (await _verification(mobile_number_context, verification["id"])).status == "expired"
    async with mobile_number_context.client_for("usr_a") as client:
        transactional_number = await _create_number(client, "+18765550117")
        transactional_verification = await _send(client, transactional_number["id"])

        async def fail_clear_primary(self: Any, *, user_id: str) -> None:
            raise RuntimeError("database update failed")

        monkeypatch.setattr(MobileNumberRepository, "clear_primary", fail_clear_primary)
        response = await _approve(
            client,
            transactional_number["id"],
            transactional_verification["id"],
            make_primary=True,
        )

    assert response.status_code == 500
    number_row = await _mobile_number(mobile_number_context, transactional_number["id"])
    verification_row = await _verification(mobile_number_context, transactional_verification["id"])
    user = await mobile_number_context.db.get(User, "usr_a")
    approved_events = list(
        (await mobile_number_context.db.scalars(
            select(AuditEvent).where(AuditEvent.event == "mobile_number.verification_approved")
        )).all()
    )
    assert number_row is not None
    assert (number_row.verification_status, number_row.verified_at, number_row.is_primary) == ("pending", None, False)
    assert (verification_row.status, verification_row.verified_at, verification_row.attempt_count) == (
        "pending",
        None,
        0,
    )
    assert user is not None
    await mobile_number_context.db.refresh(user)
    assert (user.phone, user.phone_verified) == (None, False)
    assert approved_events == []
