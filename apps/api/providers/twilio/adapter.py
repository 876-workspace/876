"""Twilio adapter that converts provider payloads to communications contracts."""

from __future__ import annotations

from providers.communications import PhoneLookup, PhoneVerification, ProviderMessage

from .client import TwilioClient
from .types import TwilioLookup, TwilioMessage, TwilioVerification


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

    async def create_lookup(self, *, number: str, include_line_type: bool = False) -> PhoneLookup:
        raw = await self._client.create_lookup(number=number, include_line_type=include_line_type)
        value = TwilioLookup.model_validate(raw)
        intelligence = value.line_type_intelligence
        return PhoneLookup(
            provider="twilio",
            number=value.phone_number,
            national_format=value.national_format,
            country_code=value.country_code,
            valid=value.valid,
            carrier_name=intelligence.carrier_name if intelligence else None,
            line_type=intelligence.type if intelligence else None,
            mobile_country_code=intelligence.mobile_country_code if intelligence else None,
            mobile_network_code=intelligence.mobile_network_code if intelligence else None,
        )


class TwilioMessagingProvider:
    def __init__(self, client: TwilioClient, *, account_sid: str, messaging_service_sid: str) -> None:
        self._client = client
        self._account_sid = account_sid
        self._messaging_service_sid = messaging_service_sid

    async def create_message(
        self,
        *,
        to_number: str,
        body: str | None,
        channel: str,
        content_sid: str | None = None,
        status_callback: str | None = None,
    ) -> ProviderMessage:
        raw = await self._client.create_message(
            account_sid=self._account_sid,
            messaging_service_sid=self._messaging_service_sid,
            to_number=("whatsapp:" + to_number) if channel == "whatsapp" else to_number,
            body=body,
            content_sid=content_sid,
            status_callback=status_callback,
        )
        value = TwilioMessage.model_validate(raw)
        return ProviderMessage("twilio", value.sid, value.status, value.to, value.from_)

    async def retrieve_message(self, *, provider_sid: str) -> ProviderMessage:
        raise NotImplementedError("Message retrieval is not required for outbound status tracking.")
