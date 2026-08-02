"""Cached Twilio Lookup resolution, shared by every caller that needs one.

Lookup is billed per request, so the cache is a cost control, not an
optimization. Any path that resolves a number through the provider must go
through here — a direct `create_lookup` call bills again for a number the
platform already knows, which is exactly what happens when several users add the
same number.
"""

from __future__ import annotations

from core.config import Settings
from core.timestamps import now_unix_seconds
from db.models import CommunicationPhoneLookup
from db.repositories.communications import CommunicationRepository
from providers.communications import PhoneLookupProvider
from providers.twilio.errors import not_configured


async def resolve_cached_lookup(
    *,
    repo: CommunicationRepository,
    provider: PhoneLookupProvider,
    settings: Settings,
    number: str,
    include_line_type: bool,
) -> CommunicationPhoneLookup:
    """Return a cached lookup when one is fresh enough, otherwise fetch and store.

    `include_line_type` only reaches the provider when the paid package is also
    enabled in settings — the caller asking for it is never sufficient on its own.
    A cached row without line-type data does not satisfy a request that needs it.
    """
    requested = include_line_type and settings.twilio_lookup_line_type_enabled
    cached = await repo.get_lookup(number)
    now = now_unix_seconds()

    if (
        cached
        and cached.created_at >= now - settings.twilio_lookup_cache_ttl_seconds
        and (not requested or cached.line_type_requested)
    ):
        return cached

    if not settings.twilio_lookup_enabled:
        raise not_configured()

    result = await provider.create_lookup(number=number, include_line_type=requested)

    return await repo.save_lookup(
        number=number,
        valid=bool(result.valid),
        e164=result.number,
        national_format=result.national_format,
        country_code=result.country_code,
        carrier_name=result.carrier_name,
        line_type=result.line_type,
        mobile_country_code=result.mobile_country_code,
        mobile_network_code=result.mobile_network_code,
        line_type_requested=requested,
        created_at=now,
    )
