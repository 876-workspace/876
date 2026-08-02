from __future__ import annotations

from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.request_validator import RequestValidator  # type: ignore[import-untyped]

from core.config import Settings
from core.errors import AppHTTPException
from db.models import CommunicationCall, CommunicationMessage, CommunicationPhoneLookup
from db.repositories.communications import CommunicationRepository
from db.repositories.mobile_numbers import MobileNumberRepository
from domains.communications.service import CommunicationsService, build_voice_twiml_url
from domains.mobile_numbers.service import MobileNumberService
from domains.twilio_webhooks.router import router as twilio_webhooks_router
from domains.twilio_webhooks.service import TwilioWebhookService, should_apply_call_status, should_apply_status
from providers.communications import MessagingProvider, PhoneLookup, ProviderCall, ProviderMessage
from providers.twilio.fake import FakeTwilioProvider


class _LookupProvider:
    def __init__(self, *, valid: bool = True) -> None:
        self.calls: list[bool] = []
        self.valid = valid

    async def create_lookup(self, *, number: str, include_line_type: bool = False) -> PhoneLookup:
        self.calls.append(include_line_type)
        return PhoneLookup(
            provider="twilio", number="+18765550100", valid=self.valid,
            carrier_name="Example Carrier" if include_line_type else None,
            line_type="mobile" if include_line_type else None,
        )


class _LookupRepo:
    def __init__(self) -> None:
        self.row: CommunicationPhoneLookup | None = None

    async def get_lookup(self, number: str) -> CommunicationPhoneLookup | None:
        return self.row

    async def save_lookup(self, **values: object) -> CommunicationPhoneLookup:
        self.row = CommunicationPhoneLookup(**values)
        return self.row


@pytest.mark.asyncio
async def test_lookup_cache_and_paid_package_gate() -> None:
    provider = _LookupProvider()
    service = CommunicationsService.__new__(CommunicationsService)
    service._settings = Settings(twilio_mode="fake", twilio_lookup_enabled=True, twilio_lookup_line_type_enabled=False)
    service._repo = cast(CommunicationRepository, _LookupRepo())
    service._lookup_provider = provider

    first = await service.lookup(number="+18765550100", include_line_type=True)
    second = await service.lookup(number="+18765550100", include_line_type=True)

    assert provider.calls == [False]
    assert first.line_type_requested is False
    assert second is first

    service._settings = Settings(
        twilio_mode="fake", twilio_lookup_enabled=True, twilio_lookup_cache_ttl_seconds=0
    )
    lookup_repo = cast(_LookupRepo, service._repo)
    assert lookup_repo.row is not None
    lookup_repo.row.created_at -= 1
    await service.lookup(number="+18765550100", include_line_type=False)
    assert provider.calls == [False, False]


@pytest.mark.asyncio
async def test_mobile_lookup_disagreement_rejects_and_outage_fails_open() -> None:
    invalid = _LookupProvider(valid=False)
    service = MobileNumberService.__new__(MobileNumberService)
    service._settings = Settings(twilio_mode="fake", twilio_lookup_enabled=True)
    service._lookup_provider = invalid
    service._repo = cast(MobileNumberRepository, SimpleNamespace(get_by_number=lambda **_: None))
    service._lookup_repo = cast(CommunicationRepository, _LookupRepo())

    with pytest.raises(AppHTTPException, match="Enter a valid"):
        await service.create(user_id="usr_1", number="+18765550100", number_type="mobile")


@pytest.mark.asyncio
async def test_mobile_lookup_outage_fails_open_to_local_normalization() -> None:
    class UnavailableLookup:
        async def create_lookup(self, **_: object) -> PhoneLookup:
            raise AppHTTPException("communications/provider-unavailable", "Unavailable", 503)

    class Repo:
        async def get_by_number(self, **_: object) -> None:
            return None

        async def create(self, **values: object) -> SimpleNamespace:
            return SimpleNamespace(**values)

    service = MobileNumberService.__new__(MobileNumberService)
    service._settings = Settings(twilio_mode="fake", twilio_lookup_enabled=True)
    service._lookup_provider = UnavailableLookup()
    service._repo = cast(MobileNumberRepository, Repo())
    service._lookup_repo = cast(CommunicationRepository, _LookupRepo())
    row = await service.create(user_id="usr_1", number="+1 (876) 555-0100", number_type="mobile")
    assert row.number == "+18765550100"


class _MessageProvider:
    def __init__(self) -> None:
        self.calls = 0

    async def create_message(self, **_: object) -> ProviderMessage:
        self.calls += 1
        return ProviderMessage("fake", "SM123", "queued", "+18765550100")

    async def retrieve_message(self, **_: object) -> ProviderMessage:
        return ProviderMessage("fake", "SM123", "delivered", "+18765550100")


class _MessageRepo:
    def __init__(self) -> None:
        self.row: CommunicationMessage | None = None

    async def get_message_by_idempotency(self, **_: object) -> CommunicationMessage | None:
        return self.row

    async def create_message(self, **values: object) -> CommunicationMessage:
        self.row = CommunicationMessage(**values)
        return self.row


class _Db:
    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        return None


class _CallProvider:
    def __init__(self) -> None:
        self.calls = 0
        self.twiml_url: str | None = None

    async def create_call(
        self, *, to_number: str, twiml_url: str, status_callback: str | None = None
    ) -> ProviderCall:
        self.calls += 1
        self.twiml_url = twiml_url
        return ProviderCall("fake", "CA123", "queued", to_number, "+18765550199")

    async def retrieve_call(self, *, provider_sid: str) -> ProviderCall:
        return ProviderCall("fake", provider_sid, "queued", "")


class _CallRepo:
    def __init__(self) -> None:
        self.row: CommunicationCall | None = None

    async def get_call_by_idempotency(self, **_: object) -> CommunicationCall | None:
        return self.row

    async def create_call(self, **values: object) -> CommunicationCall:
        self.row = CommunicationCall(**values)
        return self.row


@pytest.mark.asyncio
async def test_template_rejection_precedes_provider_and_duplicate_send_is_idempotent() -> None:
    provider = _MessageProvider()
    service = CommunicationsService.__new__(CommunicationsService)
    service._settings = Settings(twilio_mode="fake", twilio_sms_enabled=True)
    service._repo = cast(CommunicationRepository, _MessageRepo())
    service._messaging_provider = cast(MessagingProvider, provider)
    service._db = cast(AsyncSession, _Db())

    with pytest.raises(AppHTTPException) as invalid:
        await service.create_message(
            to_number="+18765550100", channel="sms", template_key="unknown", idempotency_key="same",
            user_id=None, organization_id=None, app_id="app_1", client_reference=None,
        )
    assert invalid.value.app_code == "communications/invalid-template"
    assert provider.calls == 0

    first = await service.create_message(
        to_number="+18765550100", channel="sms", template_key="sms.test", idempotency_key="same",
        user_id=None, organization_id=None, app_id="app_1", client_reference=None,
    )
    duplicate = await service.create_message(
        to_number="+18765550100", channel="sms", template_key="sms.test", idempotency_key="same",
        user_id=None, organization_id=None, app_id="app_1", client_reference=None,
    )
    assert provider.calls == 1
    assert duplicate is first
    assert "876 test notification" not in repr(first.__dict__)


@pytest.mark.asyncio
async def test_voice_template_rejection_and_disabled_gate_precede_provider_calls() -> None:
    provider = _CallProvider()
    service = CommunicationsService.__new__(CommunicationsService)
    service._settings = Settings(
        twilio_mode="fake",
        twilio_voice_enabled=True,
        twilio_webhook_base_url="https://api.example.test",
        twilio_auth_token="token",
    )
    service._repo = cast(CommunicationRepository, _CallRepo())
    service._voice_provider = provider
    service._db = cast(AsyncSession, _Db())

    with pytest.raises(AppHTTPException) as invalid:
        await service.create_call(
            to_number="+18765550100", template_key="<Say>caller input</Say>", idempotency_key="first",
            user_id=None, organization_id=None, app_id="app_1", client_reference=None,
        )
    assert invalid.value.app_code == "communications/invalid-template"
    assert provider.calls == 0

    service._settings = Settings(twilio_mode="fake", twilio_voice_enabled=False)
    with pytest.raises(AppHTTPException) as disabled:
        await service.create_call(
            to_number="+18765550100", template_key="voice.test", idempotency_key="second",
            user_id=None, organization_id=None, app_id="app_1", client_reference=None,
        )
    assert disabled.value.app_code == "communications/channel-disabled"
    assert provider.calls == 0


@pytest.mark.asyncio
async def test_fake_voice_provider_places_no_network_call_and_only_uses_signed_template_url() -> None:
    settings = Settings(
        twilio_mode="fake",
        twilio_voice_enabled=True,
        twilio_webhook_base_url="https://api.example.test",
        twilio_auth_token="token",
    )
    service = CommunicationsService.__new__(CommunicationsService)
    service._settings = settings
    service._repo = cast(CommunicationRepository, _CallRepo())
    service._voice_provider = FakeTwilioProvider()
    service._db = cast(AsyncSession, _Db())

    call = await service.create_call(
        to_number="+18765550100", template_key="voice.test", idempotency_key="first",
        user_id=None, organization_id=None, app_id="app_1", client_reference=None,
    )

    assert call.provider == "fake"
    assert call.provider_sid is not None and call.provider_sid.startswith("fake_")
    assert build_voice_twiml_url(settings, "voice.test").startswith(
        "https://api.example.test/webhooks/twilio/voice?template_key=voice.test&signature="
    )


def test_terminal_and_out_of_order_status_rules() -> None:
    assert not should_apply_status("delivered", "sent")
    assert should_apply_status("sent", "delivered")
    assert should_apply_status("sent", "failed")
    assert not should_apply_status("failed", "delivered")


def test_terminal_and_out_of_order_call_status_rules() -> None:
    assert not should_apply_call_status("ringing", "initiated")
    assert should_apply_call_status("ringing", "in-progress")
    assert should_apply_call_status("in-progress", "completed")
    assert not should_apply_call_status("completed", "ringing")
    assert not should_apply_call_status("busy", "completed")


@pytest.mark.asyncio
async def test_replayed_status_callback_is_a_no_op() -> None:
    class Repo:
        def __init__(self) -> None:
            self.events: set[tuple[str, str, str]] = set()

        async def get_webhook_event(self, **values: str) -> object | None:
            key = (values["provider_sid"], values["event_type"], values["payload_hash"])
            return key if key in self.events else None

        async def create_webhook_event(self, **values: object) -> object:
            self.events.add((str(values["provider_sid"]), str(values["event_type"]), str(values["payload_hash"])))
            return object()

        async def get_message_by_provider_sid(self, _: str) -> None:
            return None

    service = TwilioWebhookService.__new__(TwilioWebhookService)
    service._repo = cast(CommunicationRepository, Repo())
    service._db = cast(AsyncSession, _Db())
    payload = {"MessageSid": "SM123", "MessageStatus": "sent"}
    assert await service.apply_message_status(payload)
    assert not await service.apply_message_status(payload)


@pytest.mark.asyncio
async def test_call_status_callbacks_are_replay_safe_and_terminal_statuses_do_not_regress() -> None:
    call = CommunicationCall(
        id="call_1", provider="twilio", provider_sid="CA123", direction="outbound", status="ringing",
        to_number="+18765550100", from_number="+18765550199", template_key="voice.test", user_id=None,
        organization_id=None, app_id="app_1", client_reference=None, idempotency_scope="app_1",
        idempotency_key="key", duration_seconds=None, provider_error_code=None, started_at=None,
        answered_at=None, completed_at=None, created_at=1, updated_at=1,
    )

    class Repo:
        def __init__(self) -> None:
            self.events: set[tuple[str, str, str]] = set()

        async def get_webhook_event(self, **values: str) -> object | None:
            key = (values["provider_sid"], values["event_type"], values["payload_hash"])
            return key if key in self.events else None

        async def create_webhook_event(self, **values: object) -> object:
            self.events.add((str(values["provider_sid"]), str(values["event_type"]), str(values["payload_hash"])))
            return object()

        async def get_call_by_provider_sid(self, _: str) -> CommunicationCall:
            return call

    service = TwilioWebhookService.__new__(TwilioWebhookService)
    service._repo = cast(CommunicationRepository, Repo())
    service._db = cast(AsyncSession, _Db())
    completed = {"CallSid": "CA123", "CallStatus": "completed", "CallDuration": "12"}
    assert await service.apply_call_status(completed)
    assert call.status == "completed"
    assert call.duration_seconds == 12
    assert call.answered_at is not None
    assert not await service.apply_call_status(completed)
    assert await service.apply_call_status({"CallSid": "CA123", "CallStatus": "ringing"})
    assert call.status == "completed"


def test_voice_twiml_ignores_caller_input() -> None:
    settings = Settings(
        twilio_auth_token="token",
        twilio_webhook_base_url="https://api.example.test",
    )
    app = FastAPI()
    app.state.settings = settings
    app.include_router(twilio_webhooks_router)
    url = build_voice_twiml_url(settings, "voice.test")
    injection = "<Say>caller controlled</Say>"
    signature = RequestValidator(settings.twilio_auth_token).compute_signature(url, {"Injected": injection})

    with TestClient(app, base_url="https://api.example.test") as client:
        response = client.post(
            url.removeprefix("https://api.example.test"),
            data={"Injected": injection},
            headers={"X-Twilio-Signature": signature},
        )

    assert response.status_code == 200
    assert response.text == "<Response><Say>876 test notification</Say></Response>"
    assert injection not in response.text


@pytest.mark.asyncio
async def test_mobile_number_creation_reuses_the_lookup_cache_across_users() -> None:
    """Adding the same number for two users must bill exactly one lookup.

    Regression: create() called the provider directly, so every user adding a
    number the platform already knew about billed a fresh Lookup request.
    """
    provider = _LookupProvider()
    shared_repo = cast(CommunicationRepository, _LookupRepo())

    async def _create_for(user_id: str) -> None:
        service = MobileNumberService.__new__(MobileNumberService)
        service._settings = Settings(twilio_mode="fake", twilio_lookup_enabled=True)
        service._lookup_provider = provider
        service._lookup_repo = shared_repo
        service._repo = cast(
            MobileNumberRepository,
            SimpleNamespace(
                get_by_number=_none_coroutine,
                create=_namespace_coroutine,
            ),
        )
        await service.create(user_id=user_id, number="+18765550100", number_type="mobile")

    await _create_for("usr_1")
    await _create_for("usr_2")

    assert provider.calls == [False]


async def _none_coroutine(**_: object) -> None:
    return None


async def _namespace_coroutine(**values: object) -> SimpleNamespace:
    return SimpleNamespace(**values)


@pytest.mark.asyncio
async def test_failed_send_keeps_its_idempotency_record() -> None:
    """A provider failure must leave the idempotency row committed.

    Regression: the failure path only flushed, and get_db() rolls the request
    transaction back on the re-raise — so the row and its idempotency key
    vanished, and the retry after an uncertain timeout billed a second message.
    """

    class FailingProvider:
        async def create_message(self, **_: object) -> ProviderMessage:
            raise AppHTTPException("communications/provider-unavailable", "Unavailable", 503)

        async def retrieve_message(self, **_: object) -> ProviderMessage:
            raise AssertionError("not reached")

    class RecordingDb:
        def __init__(self) -> None:
            self.commits = 0

        async def commit(self) -> None:
            self.commits += 1

        async def flush(self) -> None:
            return None

    db = RecordingDb()
    service = CommunicationsService.__new__(CommunicationsService)
    service._settings = Settings(twilio_mode="fake", twilio_sms_enabled=True)
    service._repo = cast(CommunicationRepository, _MessageRepo())
    service._messaging_provider = cast(MessagingProvider, FailingProvider())
    service._db = cast(AsyncSession, db)

    with pytest.raises(AppHTTPException):
        await service.create_message(
            to_number="+18765550100", channel="sms", template_key="sms.test", idempotency_key="k1",
            user_id=None, organization_id=None, app_id="app_1", client_reference=None,
        )

    # One commit for the intent before the provider call, one for the failure.
    assert db.commits == 2


@pytest.mark.asyncio
async def test_whatsapp_without_a_configured_content_sid_is_unavailable() -> None:
    """A placeholder content SID would be rejected by Twilio at send time."""
    provider = _MessageProvider()
    service = CommunicationsService.__new__(CommunicationsService)
    service._settings = Settings(twilio_mode="fake", twilio_whatsapp_enabled=True)
    service._repo = cast(CommunicationRepository, _MessageRepo())
    service._messaging_provider = cast(MessagingProvider, provider)
    service._db = cast(AsyncSession, _Db())

    with pytest.raises(AppHTTPException) as exc_info:
        await service.create_message(
            to_number="+18765550100", channel="whatsapp", template_key="whatsapp.test",
            idempotency_key="k2", user_id=None, organization_id=None, app_id="app_1",
            client_reference=None,
        )

    assert exc_info.value.app_code == "communications/invalid-template"
    assert provider.calls == 0
