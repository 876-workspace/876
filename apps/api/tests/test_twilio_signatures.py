from twilio.request_validator import RequestValidator  # type: ignore[import-untyped]

from providers.twilio.signatures import TwilioWebhookVerifier


def test_signature_validation_uses_configured_public_url() -> None:
    params = {"MessageSid": "SM123", "From": "+18765550100"}
    url = "https://public.876.example/webhooks/twilio/messages/inbound"
    signature = RequestValidator("auth-token").compute_signature(url, params)
    verifier = TwilioWebhookVerifier(auth_token="auth-token", webhook_base_url="https://public.876.example")

    assert verifier.validate(path="/webhooks/twilio/messages/inbound", params=params, signature=signature)
    assert not verifier.validate(path="/webhooks/twilio/messages/status", params=params, signature=signature)
    assert not verifier.validate(path="/webhooks/twilio/messages/inbound", params=params, signature="bad")
