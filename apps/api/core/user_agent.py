"""User-agent parsing for auth telemetry.

A small, stable interface over `ua-parser` (v1) plus the client-hint refinement
that answers the questions a user-agent string alone cannot: *which* iPhone,
*which* Android handset, and the real browser version now that Chrome freezes
the one it advertises.

Client hints always win over the parsed user agent when both are present —
`Sec-CH-UA-Platform-Version` / `Sec-CH-UA-Model` are reported by the browser
itself, while the user-agent string is a legacy best guess.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from typing import Any

import ua_parser

DEVICE_TYPES = ("desktop", "mobile", "tablet", "bot", "other")

_BOT_TOKENS = ("bot", "spider", "crawler", "curl", "wget", "python-requests", "httpx", "postman")
_DESKTOP_TOKENS = ("windows", "macintosh", "mac os", "linux", "x11", "cros")
_DESKTOP_OS_FAMILIES = frozenset(
    {"Windows", "Mac OS X", "macOS", "Linux", "Ubuntu", "Fedora", "Chrome OS", "ChromeOS"}
)
# Client hints pad the brand list with a deliberately meaningless entry to
# break naive parsers ("Not_A Brand", "Not.A/Brand", ";Not A Brand"…).
_HINT_FILLER = "not"


@dataclass(frozen=True)
class ParsedUserAgent:
    """A user agent reduced to the fields telemetry stores and Console renders."""

    device_type: str
    device_brand: str | None
    device_model: str | None
    os_name: str | None
    os_version: str | None
    browser_name: str | None
    browser_version: str | None
    is_bot: bool


_EMPTY = ParsedUserAgent("other", None, None, None, None, None, None, False)


def _clean(value: Any) -> str | None:
    """Normalizes a ua-parser field, treating its `Other` sentinel as absent."""
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    if not stripped or stripped == "Other":
        return None
    return stripped


def _version(*parts: Any) -> str | None:
    """Joins ua-parser's split version components into a dotted string."""
    collected: list[str] = []
    for part in parts:
        if part is None or part == "":
            break
        collected.append(str(part))
    return ".".join(collected) or None


def _resolve_device_type(*, lowered: str, os_name: str | None, is_bot: bool) -> str:
    if is_bot:
        return "bot"

    if "ipad" in lowered or "tablet" in lowered:
        return "tablet"

    # Android reports "Mobile" only on handsets; an Android UA without it is a tablet.
    if "android" in lowered and "mobile" not in lowered:
        return "tablet"

    if any(token in lowered for token in ("mobile", "iphone", "ipod", "android")):
        return "mobile"

    if os_name in _DESKTOP_OS_FAMILIES or any(token in lowered for token in _DESKTOP_TOKENS):
        return "desktop"

    return "other"


def parse_user_agent(user_agent: str | None) -> ParsedUserAgent:
    """Parses a raw user-agent string into the telemetry device fields.

    Never raises: an unparseable or missing user agent degrades to `other`
    rather than failing the authentication request that carried it.
    """
    if not user_agent:
        return _EMPTY

    lowered = user_agent.lower()
    is_bot = any(token in lowered for token in _BOT_TOKENS)

    try:
        result = ua_parser.parse(user_agent)
    except Exception:
        return replace(_EMPTY, device_type="bot" if is_bot else "other", is_bot=is_bot)

    device = result.device
    os_result = result.os
    browser = result.user_agent

    device_brand = _clean(getattr(device, "brand", None)) if device else None
    device_model = _clean(getattr(device, "model", None)) if device else None
    device_family = _clean(getattr(device, "family", None)) if device else None
    if device_family == "Spider":
        is_bot = True

    os_name = _clean(getattr(os_result, "family", None)) if os_result else None
    browser_name = _clean(getattr(browser, "family", None)) if browser else None

    return ParsedUserAgent(
        device_type=_resolve_device_type(lowered=lowered, os_name=os_name, is_bot=is_bot),
        device_brand=device_brand,
        # ua-parser only exposes a model for handsets that publish one (Android);
        # fall back to the device family ("iPhone") so the column is never blank.
        device_model=device_model or device_family,
        os_name=os_name,
        os_version=(
            _version(os_result.major, os_result.minor, os_result.patch) if os_result else None
        ),
        browser_name=browser_name,
        browser_version=(
            _version(browser.major, browser.minor, browser.patch) if browser else None
        ),
        is_bot=is_bot,
    )


def _pick_hint_version(versions: Sequence[Any], browser_name: str | None) -> str | None:
    """Selects the real browser version from a `fullVersionList` brand list.

    The list is deliberately salted with a filler brand and ordered
    unpredictably, so match on the parsed browser name first and fall back to
    the last entry that is not filler — never simply `versions[0]`.
    """
    candidates: list[tuple[str, str]] = []
    for entry in versions:
        if not isinstance(entry, Mapping):
            continue
        brand = entry.get("brand")
        version = entry.get("version")
        if isinstance(brand, str) and isinstance(version, str) and version:
            candidates.append((brand, version))

    real = [(brand, version) for brand, version in candidates if _HINT_FILLER not in brand.lower()]
    if not real:
        return None

    if browser_name:
        needle = browser_name.lower().removesuffix(" mobile").strip()
        for brand, version in real:
            if needle and needle in brand.lower():
                return version

    return real[-1][1]


def refine_with_client_hints(
    parsed: ParsedUserAgent, hints: Mapping[str, Any] | None
) -> ParsedUserAgent:
    """Overlays high-entropy client hints onto a parsed user agent.

    Hints are authoritative where present: they carry the true OS version and,
    on Android, the true handset model.
    """
    if not hints:
        return parsed

    platform_version = hints.get("platformVersion")
    model = hints.get("model")
    versions = hints.get("fullVersionList")

    browser_version = parsed.browser_version
    if isinstance(versions, Sequence) and not isinstance(versions, (str, bytes)):
        picked = _pick_hint_version(versions, parsed.browser_name)
        if picked:
            browser_version = picked

    os_name = parsed.os_name
    platform = hints.get("platform")
    if not os_name and isinstance(platform, str) and platform.strip():
        os_name = platform.strip()

    device_type = parsed.device_type
    mobile = hints.get("mobile")
    if isinstance(mobile, bool) and device_type in {"other", "desktop", "mobile"}:
        device_type = "mobile" if mobile else "desktop"

    return replace(
        parsed,
        device_type=device_type,
        device_model=model.strip() if isinstance(model, str) and model.strip() else parsed.device_model,
        os_name=os_name,
        os_version=(
            platform_version.strip()
            if isinstance(platform_version, str) and platform_version.strip()
            else parsed.os_version
        ),
        browser_version=browser_version,
    )
