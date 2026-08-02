"""Small async REST client for Twilio Verify and Lookup APIs."""

from __future__ import annotations

import time
from typing import Any, cast

import httpx

from core.logging import get_logger

from .errors import mask_phone_number, normalize_twilio_error, provider_unavailable
from .types import verification_check_form, verification_create_form

logger = get_logger(__name__)


class TwilioClient:
    def __init__(
        self,
        *,
        api_key: str,
        api_key_secret: str,
        verify_base_url: str = "https://verify.twilio.com",
        lookup_base_url: str = "https://lookups.twilio.com",
    ) -> None:
        self._verify_base_url = verify_base_url.rstrip("/")
        self._lookup_base_url = lookup_base_url.rstrip("/")
        self._client = httpx.AsyncClient(auth=(api_key, api_key_secret), timeout=15.0)

    async def _request(
        self,
        method: str,
        url: str,
        *,
        data: dict[str, str] | None = None,
        to_number: str | None = None,
    ) -> dict[str, Any]:
        # Masked, never raw: the last four digits are enough to correlate a support
        # report with a log line, and are not a reversible identifier on their own.
        context: dict[str, object] = {"to": mask_phone_number(to_number)}
        started = time.perf_counter()
        try:
            response = await self._client.request(method, url, data=data)
            response.raise_for_status()
            return cast(dict[str, Any], response.json())
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "twilio.request_failed",
                method=method,
                status=exc.response.status_code,
                latency_ms=(time.perf_counter() - started) * 1000,
                **context,
            )
            raise normalize_twilio_error(exc, context=context) from exc
        except httpx.HTTPError as exc:
            logger.warning(
                "twilio.request_error",
                method=method,
                latency_ms=(time.perf_counter() - started) * 1000,
                **context,
            )
            raise provider_unavailable(exc, context=context) from exc

    async def create_verification(self, *, service_sid: str, to_number: str, channel: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"{self._verify_base_url}/v2/Services/{service_sid}/Verifications",
            data=verification_create_form(to_number=to_number, channel=channel),
            to_number=to_number,
        )

    async def approve_verification(self, *, service_sid: str, to_number: str, code: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"{self._verify_base_url}/v2/Services/{service_sid}/VerificationCheck",
            data=verification_check_form(to_number=to_number, code=code),
            to_number=to_number,
        )

    async def create_lookup(self, *, number: str) -> dict[str, Any]:
        return await self._request("GET", f"{self._lookup_base_url}/v2/PhoneNumbers/{number}", to_number=number)

    async def aclose(self) -> None:
        await self._client.aclose()
