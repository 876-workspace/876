import base64

import httpx
import pytest

from core.errors import AppHTTPException
from providers.twilio.client import TwilioClient


@pytest.mark.asyncio
async def test_verify_request_uses_form_body_and_api_key_basic_auth() -> None:
    captured: dict[str, str] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["authorization"] = request.headers["authorization"]
        captured["body"] = request.content.decode()
        captured["path"] = request.url.path
        return httpx.Response(201, json={"sid": "VE123", "status": "pending", "to": "+18765550100", "channel": "sms"})

    client = TwilioClient(api_key="SK123", api_key_secret="secret")
    await client._client.aclose()
    client._client = httpx.AsyncClient(
        auth=httpx.BasicAuth("SK123", "secret"),
        transport=httpx.MockTransport(handler),
        timeout=15.0,
    )
    result = await client.create_verification(service_sid="VA123", to_number="+18765550100", channel="sms")

    assert result["sid"] == "VE123"
    assert captured["path"] == "/v2/Services/VA123/Verifications"
    assert captured["body"] == "To=%2B18765550100&Channel=sms"
    assert captured["authorization"] == "Basic " + base64.b64encode(b"SK123:secret").decode()
    await client.aclose()


@pytest.mark.asyncio
async def test_timeout_becomes_provider_unavailable() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = TwilioClient(api_key="SK123", api_key_secret="secret")
    await client._client.aclose()
    client._client = httpx.AsyncClient(
        auth=httpx.BasicAuth("SK123", "secret"),
        transport=httpx.MockTransport(handler),
        timeout=15.0,
    )

    with pytest.raises(AppHTTPException) as exc_info:
        await client.create_verification(service_sid="VA123", to_number="+18765550100", channel="sms")
    assert exc_info.value.app_code == "communications/provider-unavailable"
    await client.aclose()
