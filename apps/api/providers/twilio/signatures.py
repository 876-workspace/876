"""Twilio webhook signature verification pinned to the configured public URL."""

from __future__ import annotations

from urllib.parse import urljoin

from twilio.request_validator import RequestValidator  # type: ignore[import-untyped]


class TwilioWebhookVerifier:
    """Validate signed Twilio webhooks without trusting proxy-reconstructed hosts."""

    def __init__(self, *, auth_token: str, webhook_base_url: str) -> None:
        self._validator = RequestValidator(auth_token)
        self._base_url = webhook_base_url.rstrip("/") + "/"

    def validate(self, *, path: str, params: dict[str, str], signature: str) -> bool:
        url = urljoin(self._base_url, path.lstrip("/"))
        return bool(self._validator.validate(url, params, signature))
