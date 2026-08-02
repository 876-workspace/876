"""Deterministic, in-process communications provider for local development/tests."""

from __future__ import annotations

import hashlib

from providers.communications import PhoneLookup, PhoneVerification, ProviderCall, ProviderMessage


class FakeTwilioProvider:
    """No-network provider; code ``000000`` is the only approved fake code."""

    async def create_verification(self, *, to_number: str, channel: str) -> PhoneVerification:
        return PhoneVerification(
            provider="fake",
            provider_sid=self._sid("verify", to_number, channel),
            status="pending",
            to_number=to_number,
            channel=channel,
        )

    async def approve_verification(self, *, to_number: str, code: str) -> PhoneVerification:
        approved = code == "000000"
        return PhoneVerification(
            provider="fake",
            provider_sid=self._sid("check", to_number),
            status="approved" if approved else "pending",
            to_number=to_number,
            channel="",
            valid=approved,
        )

    async def create_lookup(self, *, number: str, include_line_type: bool = False) -> PhoneLookup:
        return PhoneLookup(provider="fake", number=number, valid=True)

    async def create_message(
        self, *, to_number: str, body: str | None, channel: str, content_sid: str | None = None,
        status_callback: str | None = None,
    ) -> ProviderMessage:
        return ProviderMessage("fake", self._sid("message", to_number, channel), "queued", to_number)

    async def retrieve_message(self, *, provider_sid: str) -> ProviderMessage:
        return ProviderMessage("fake", provider_sid, "queued", "")

    async def create_call(self, *, to_number: str, twiml_url: str) -> ProviderCall:
        return ProviderCall("fake", self._sid("call", to_number), "queued", to_number)

    async def retrieve_call(self, *, provider_sid: str) -> ProviderCall:
        return ProviderCall("fake", provider_sid, "queued", "")

    @staticmethod
    def _sid(*parts: str) -> str:
        return "fake_" + hashlib.sha256("|".join(parts).encode()).hexdigest()[:24]
