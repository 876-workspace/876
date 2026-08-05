from __future__ import annotations

import base64
import json
from types import SimpleNamespace
from typing import Any

import pytest

from db.repositories.auth_attempts import AuthAttemptRepository
from db.repositories.user_devices import UserDeviceRepository
from services.auth_telemetry import AuthTelemetryService

TRUSTED_HEADERS = {
    "x-876-client-ip": "203.0.113.42",
    "x-876-client-ua": (
        "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    ),
    "x-876-geo-country": "JM",
    "x-876-geo-region": "Kingston",
    "x-876-geo-city": "Kingston",
    "x-876-geo-asn": "AS12345",
    "x-876-geo-as-org": "Flow Jamaica",
    "x-876-realm": "consumer",
}


def encode_signal(**overrides: Any) -> str:
    payload: dict[str, Any] = {
        "version": 1,
        "visitorId": "a" * 32,
        "confidence": "high",
        "hints": {"platformVersion": "15.0.0", "model": "SM-S928B"},
        "components": {"canvas": "deadbeef"},
    }
    payload.update(overrides)
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def make_request(headers: dict[str, str] | None = None, *, api_key: bool = True) -> Any:
    resolved = dict(TRUSTED_HEADERS)
    if headers is not None:
        resolved.update(headers)
    state = SimpleNamespace(app_id="app_1")
    if api_key:
        state.api_key = SimpleNamespace(id="key_1")
    return SimpleNamespace(
        headers={key.lower(): value for key, value in resolved.items()},
        client=SimpleNamespace(host="10.0.0.1"),
        state=state,
    )


class RecordingRepos:
    """Captures what the service would have written, without a database."""

    def __init__(self) -> None:
        self.attempts: list[dict[str, Any]] = []
        self.devices: list[dict[str, Any]] = []

    def install(self, monkeypatch: pytest.MonkeyPatch) -> None:
        async def create(_self: Any, **values: Any) -> Any:
            self.attempts.append(values)
            return SimpleNamespace(id="atmp_1", **values)

        async def record_seen(_self: Any, **values: Any) -> Any:
            self.devices.append(values)
            return SimpleNamespace(id="dev_1", **values)

        monkeypatch.setattr(AuthAttemptRepository, "create", create)
        monkeypatch.setattr(UserDeviceRepository, "record_seen", record_seen)


@pytest.fixture
def repos(monkeypatch: pytest.MonkeyPatch) -> RecordingRepos:
    recorder = RecordingRepos()
    recorder.install(monkeypatch)
    return recorder


class TestRecordSucceeded:
    @pytest.mark.asyncio
    async def test_records_geo_and_parsed_device_for_a_trusted_request(
        self, repos: RecordingRepos
    ) -> None:
        request = make_request({"x-876-device": encode_signal()})

        result = await AuthTelemetryService(object()).record(
            request=request, event="login", outcome="succeeded", user_id="usr_1"
        )

        assert result.id == "atmp_1"
        assert len(repos.attempts) == 1
        attempt = repos.attempts[0]

        assert attempt["event"] == "login"
        assert attempt["outcome"] == "succeeded"
        assert attempt["user_id"] == "usr_1"
        assert attempt["ip_address"] == "203.0.113.42"
        assert attempt["ip_country_code"] == "JM"
        assert attempt["ip_city"] == "Kingston"
        assert attempt["ip_as_organization"] == "Flow Jamaica"
        assert attempt["context_trusted"] is True
        assert attempt["realm"] == "consumer"
        assert attempt["device_brand"] == "Samsung"
        assert attempt["device_model"] == "SM-S928B"
        assert attempt["os_name"] == "Android"
        # The client hint (15.0.0) wins over the user-agent string (15).
        assert attempt["os_version"] == "15.0.0"
        assert attempt["is_bot"] is False

    @pytest.mark.asyncio
    async def test_returns_context_for_the_session_row(self, repos: RecordingRepos) -> None:
        result = await AuthTelemetryService(object()).record(
            request=make_request(), event="login", outcome="succeeded", user_id="usr_1"
        )

        assert result.context is not None
        assert result.context.ip == "203.0.113.42"
        assert result.context.country_code == "JM"
        assert result.context.city == "Kingston"
        assert result.context.as_organization == "Flow Jamaica"

    @pytest.mark.asyncio
    async def test_upserts_a_device_when_user_and_signal_are_both_known(
        self, repos: RecordingRepos
    ) -> None:
        request = make_request({"x-876-device": encode_signal()})

        result = await AuthTelemetryService(object()).record(
            request=request, event="login", outcome="succeeded", user_id="usr_1"
        )

        assert result.device_id == "dev_1"
        assert len(repos.devices) == 1
        assert repos.devices[0]["fingerprint"] == "a" * 32
        assert repos.devices[0]["last_country_code"] == "JM"
        # Raw component digests are never persisted on the device row.
        assert "components" not in repos.devices[0]["signal"]

    @pytest.mark.asyncio
    async def test_does_not_upsert_a_device_without_a_resolved_user(
        self, repos: RecordingRepos
    ) -> None:
        request = make_request({"x-876-device": encode_signal()})

        result = await AuthTelemetryService(object()).record(
            request=request, event="login", outcome="failed", identifier="a@example.com"
        )

        assert repos.devices == []
        assert result.device_id is None
        # The fingerprint is still recorded, so anonymous attempts remain linkable.
        assert repos.attempts[0]["device_fingerprint"] == "a" * 32

    @pytest.mark.asyncio
    async def test_lowercases_the_identifier(self, repos: RecordingRepos) -> None:
        await AuthTelemetryService(object()).record(
            request=make_request(),
            event="login",
            outcome="failed",
            identifier="Alejandra@Example.COM",
        )

        assert repos.attempts[0]["identifier"] == "alejandra@example.com"


class TestUntrustedContext:
    @pytest.mark.asyncio
    async def test_ignores_spoofed_headers_without_an_api_key(self, repos: RecordingRepos) -> None:
        request = make_request(api_key=False)

        await AuthTelemetryService(object()).record(
            request=request, event="login", outcome="failed", identifier="a@example.com"
        )

        attempt = repos.attempts[0]
        assert attempt["context_trusted"] is False
        assert attempt["ip_address"] != "203.0.113.42"
        assert attempt["ip_country_code"] is None


class TestMalformedSignal:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "value",
        [
            "not-base64!!",
            base64.urlsafe_b64encode(b"{not json").decode(),
            base64.urlsafe_b64encode(json.dumps({"nope": 1}).encode()).decode(),
            "A" * 9000,
        ],
    )
    async def test_a_malformed_signal_never_breaks_recording(
        self, repos: RecordingRepos, value: str
    ) -> None:
        request = make_request({"x-876-device": value})

        result = await AuthTelemetryService(object()).record(
            request=request, event="login", outcome="succeeded", user_id="usr_1"
        )

        assert result.id == "atmp_1"
        assert repos.attempts[0]["device_fingerprint"] is None


class TestFailureIsolation:
    @pytest.mark.asyncio
    async def test_a_raising_repository_is_swallowed(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        async def boom(_self: Any, **_values: Any) -> Any:
            raise RuntimeError("database is on fire")

        monkeypatch.setattr(AuthAttemptRepository, "create", boom)

        result = await AuthTelemetryService(object()).record(
            request=make_request(), event="login", outcome="succeeded", user_id="usr_1"
        )

        assert result.id is None
        assert result.device_id is None
        assert result.context is None

    @pytest.mark.asyncio
    async def test_a_raising_device_upsert_is_swallowed(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        async def boom(_self: Any, **_values: Any) -> Any:
            raise RuntimeError("device upsert failed")

        monkeypatch.setattr(UserDeviceRepository, "record_seen", boom)

        result = await AuthTelemetryService(object()).record(
            request=make_request({"x-876-device": encode_signal()}),
            event="login",
            outcome="succeeded",
            user_id="usr_1",
        )

        assert result.id is None
