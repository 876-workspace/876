"""Request metadata resolution at the API trust boundary."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request

_UNKNOWN_COUNTRIES = frozenset({"XX", "T1"})


@dataclass(frozen=True)
class RequestGeo:
    country_code: str | None
    region_code: str | None
    region: str | None
    city: str | None
    postal_code: str | None
    timezone: str | None
    latitude: str | None
    longitude: str | None
    asn: str | None
    as_organization: str | None


@dataclass(frozen=True)
class RequestContext:
    ip: str | None
    user_agent: str | None
    geo: RequestGeo
    device_signal: str | None
    origin: str | None
    request_id: str | None
    trusted: bool


def _value(request: Request, name: str) -> str | None:
    value = request.headers.get(name)
    if value is None:
        return None
    value = value.replace("\r", "").replace("\n", "").strip()[:8192]
    return value or None


def _country(value: str | None) -> str | None:
    if value is None or value.upper() in _UNKNOWN_COUNTRIES:
        return None
    return value.upper()


def _fallback_ip(request: Request) -> str | None:
    forwarded = _value(request, "x-forwarded-for")
    if forwarded:
        return forwarded.split(",", maxsplit=1)[0].strip() or None
    client = getattr(request, "client", None)
    host = getattr(client, "host", None)
    return host if isinstance(host, str) else None


def resolve_request_context(request: Request) -> RequestContext:
    """Resolve bridge metadata only after API-key validation has completed."""
    trusted = getattr(request.state, "api_key", None) is not None
    if trusted:
        geo = RequestGeo(
            country_code=_country(_value(request, "x-876-geo-country")),
            region_code=_value(request, "x-876-geo-region-code"),
            region=_value(request, "x-876-geo-region"),
            city=_value(request, "x-876-geo-city"),
            postal_code=_value(request, "x-876-geo-postal"),
            timezone=_value(request, "x-876-geo-timezone"),
            latitude=_value(request, "x-876-geo-latitude"),
            longitude=_value(request, "x-876-geo-longitude"),
            asn=_value(request, "x-876-geo-asn"),
            as_organization=_value(request, "x-876-geo-as-org"),
        )
        return RequestContext(
            ip=_value(request, "x-876-client-ip"),
            user_agent=_value(request, "x-876-client-ua"),
            geo=geo,
            device_signal=_value(request, "x-876-device"),
            origin=_value(request, "x-876-origin"),
            request_id=_value(request, "x-request-id"),
            trusted=True,
        )

    return RequestContext(
        ip=_value(request, "cf-connecting-ip") or _fallback_ip(request),
        user_agent=_value(request, "user-agent"),
        geo=RequestGeo(None, None, None, None, None, None, None, None, None, None),
        device_signal=None,
        origin=_value(request, "origin"),
        request_id=_value(request, "x-request-id"),
        trusted=False,
    )
