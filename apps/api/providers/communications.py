"""Provider-neutral contracts for communications capabilities.

Concrete providers raise :class:`core.errors.AppHTTPException` for hard failures.
Callers must never infer verification success from transport success; only a
``PhoneVerification`` whose status is ``approved`` may verify a number.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass(frozen=True)
class PhoneVerification:
    """Provider result for a phone verification create or approval operation."""

    provider: str
    provider_sid: str
    status: str
    to_number: str
    channel: str
    valid: bool = False
    expires_at: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ProviderMessage:
    """Provider-normalized message state reserved for the Phase 2 adapter."""

    provider: str
    provider_sid: str
    status: str
    to_number: str
    from_number: str | None = None


@dataclass(frozen=True)
class ProviderCall:
    """Provider-normalized voice-call state reserved for the Phase 2 adapter."""

    provider: str
    provider_sid: str
    status: str
    to_number: str
    from_number: str | None = None


@dataclass(frozen=True)
class PhoneLookup:
    """Provider result for an E.164 number lookup."""

    provider: str
    number: str
    national_format: str | None = None
    country_code: str | None = None
    valid: bool | None = None


@runtime_checkable
class PhoneVerificationProvider(Protocol):
    """Phone verification operations.

    Implementations raise ``AppHTTPException`` for unavailable/configuration
    failures and return a result for provider verification states.
    """

    async def create_verification(self, *, to_number: str, channel: str) -> PhoneVerification: ...

    async def approve_verification(self, *, to_number: str, code: str) -> PhoneVerification: ...


@runtime_checkable
class MessagingProvider(Protocol):
    """Reserved Phase 2 message operations with the same hard-error contract."""

    async def create_message(self, *, to_number: str, body: str, channel: str) -> ProviderMessage: ...

    async def retrieve_message(self, *, provider_sid: str) -> ProviderMessage: ...


@runtime_checkable
class VoiceProvider(Protocol):
    """Reserved Phase 2 voice operations with the same hard-error contract."""

    async def create_call(self, *, to_number: str, twiml_url: str) -> ProviderCall: ...

    async def retrieve_call(self, *, provider_sid: str) -> ProviderCall: ...


@runtime_checkable
class PhoneLookupProvider(Protocol):
    """Provider number lookup operation with the same hard-error contract."""

    async def create_lookup(self, *, number: str) -> PhoneLookup: ...


@runtime_checkable
class CommunicationsWebhookVerifier(Protocol):
    """Verifies a provider-signed webhook without parsing provider payloads."""

    def validate(self, *, path: str, params: dict[str, str], signature: str) -> bool: ...
