"""Twilio communications provider selection; disabled is always the default."""

from __future__ import annotations

from core.config import Settings, get_settings
from providers.communications import PhoneLookup, PhoneLookupProvider, PhoneVerification, PhoneVerificationProvider

from .adapter import TwilioPhoneLookupProvider, TwilioPhoneVerificationProvider
from .client import TwilioClient
from .errors import not_configured
from .fake import FakeTwilioProvider


class DisabledTwilioProvider:
    """Fails closed before a provider request can be attempted."""

    async def create_verification(self, *, to_number: str, channel: str) -> PhoneVerification:
        raise not_configured()

    async def approve_verification(self, *, to_number: str, code: str) -> PhoneVerification:
        raise not_configured()

    async def create_lookup(self, *, number: str) -> PhoneLookup:
        raise not_configured()


_clients: dict[tuple[str, str], TwilioClient] = {}


def _shared_client(api_key: str, api_key_secret: str) -> TwilioClient:
    """One client — and so one connection pool — per credential pair.

    `TwilioClient` owns an `httpx.AsyncClient`, and these factories are called
    from service constructors on every request. Building one per call leaks a
    connection pool and its file descriptors for the life of the process, and no
    test can catch it: `disabled` and `fake` mode never construct a client at all.
    """
    key = (api_key, api_key_secret)
    client = _clients.get(key)
    if client is None:
        client = TwilioClient(api_key=api_key, api_key_secret=api_key_secret)
        _clients[key] = client
    return client


async def close_shared_clients() -> None:
    """Close pooled clients at shutdown. Safe to call when none were built."""
    for client in list(_clients.values()):
        await client.aclose()
    _clients.clear()


def get_phone_verification_provider(settings: Settings | None = None) -> PhoneVerificationProvider:
    configured = settings or get_settings()
    if configured.twilio_mode == "fake":
        return FakeTwilioProvider()
    if not configured.twilio_live_enabled:
        return DisabledTwilioProvider()
    client = _shared_client(configured.twilio_api_key, configured.twilio_api_key_secret)
    return TwilioPhoneVerificationProvider(client, verify_service_sid=configured.twilio_verify_service_sid)


def get_phone_lookup_provider(settings: Settings | None = None) -> PhoneLookupProvider:
    configured = settings or get_settings()
    if configured.twilio_mode == "fake":
        return FakeTwilioProvider()
    if not configured.twilio_live_enabled or not configured.twilio_lookup_enabled:
        return DisabledTwilioProvider()
    client = _shared_client(configured.twilio_api_key, configured.twilio_api_key_secret)
    return TwilioPhoneLookupProvider(client)


__all__ = [
    "DisabledTwilioProvider",
    "FakeTwilioProvider",
    "TwilioClient",
    "close_shared_clients",
    "get_phone_lookup_provider",
    "get_phone_verification_provider",
]
