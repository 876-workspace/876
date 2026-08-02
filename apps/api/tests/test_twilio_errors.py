import httpx

from providers.twilio.errors import mask_phone_number, normalize_twilio_error


def test_twilio_rate_limit_error_is_normalized() -> None:
    request = httpx.Request("POST", "https://verify.twilio.com/v2/Services/VA123/Verifications")
    response = httpx.Response(429, request=request, json={"code": 20429, "message": "too many"})

    error = normalize_twilio_error(httpx.HTTPStatusError("bad", request=request, response=response))

    assert error.app_code == "communications/rate-limited"
    assert error.status_code == 429


def test_phone_mask_never_retains_full_number() -> None:
    assert mask_phone_number("+18765550100") == "+***0100"
