"""Twilio adapter that converts provider payloads to communications contracts."""

from __future__ import annotations

from providers.communications import PhoneLookup, PhoneVerification

from .client import TwilioClient
from .types import TwilioLookup, TwilioVerification


class TwilioPhoneVerificationProvider:
    """Twilio Verify implementation of the provider-neutral verification contract."""

    def __init__(self, client: TwilioClient, *, verify_service_sid: str) -> None:
        self._client = client
        self._verify_service_sid = verify_service_sid

    @staticmethod
    def _verification(raw: dict[str, object]) -> PhoneVerification:
        value = TwilioVerification.model_validate(raw)
        return PhoneVerification(
            provider="twilio",
            provider_sid=value.sid,
            status=value.status,
            to_number=value.to,
            channel=value.channel or "",
            valid=value.valid,
        )

    async def create_verification(self, *, to_number: str, channel: str) -> PhoneVerification:
        raw = await self._client.create_verification(
            service_sid=self._verify_service_sid,
            to_number=to_number,
            channel=channel,
        )
        return self._verification(raw)

    async def approve_verification(self, *, to_number: str, code: str) -> PhoneVerification:
        raw = await self._client.approve_verification(
            service_sid=self._verify_service_sid,
            to_number=to_number,
            code=code,
        )
        return self._verification(raw)


class TwilioPhoneLookupProvider:
    """Twilio Lookup implementation of the provider-neutral lookup contract."""

    def __init__(self, client: TwilioClient) -> None:
        self._client = client

    async def create_lookup(self, *, number: str) -> PhoneLookup:
        raw = await self._client.create_lookup(number=number)
        value = TwilioLookup.model_validate(raw)
        return PhoneLookup(
            provider="twilio",
            number=value.phone_number,
            national_format=value.national_format,
            country_code=value.country_code,
            valid=value.valid,
        )
