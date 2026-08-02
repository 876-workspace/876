import pytest

from core.config import Settings
from core.errors import AppHTTPException
from domains.mobile_numbers.service import MobileNumberService, normalize_phone_number
from providers.twilio import get_phone_verification_provider
from providers.twilio.fake import FakeTwilioProvider


def test_e164_normalization_matches_client_compatible_international_input() -> None:
    assert normalize_phone_number("+1 (876) 555-0100") == "+18765550100"
    with pytest.raises(AppHTTPException) as exc_info:
        normalize_phone_number("8765550100")
    assert exc_info.value.app_code == "communications/invalid-phone-number"


@pytest.mark.asyncio
async def test_fake_provider_is_deterministic_and_never_persists_code() -> None:
    provider = FakeTwilioProvider()
    created = await provider.create_verification(to_number="+18765550100", channel="sms")
    approved = await provider.approve_verification(to_number="+18765550100", code="000000")
    failed = await provider.approve_verification(to_number="+18765550100", code="111111")

    assert created.provider_sid.startswith("fake_")
    assert approved.status == "approved"
    assert failed.status == "pending"
    assert "000000" not in repr(created)


@pytest.mark.asyncio
async def test_disabled_mode_fails_closed_before_provider_usage() -> None:
    settings = Settings(
        twilio_mode="disabled",
        twilio_verify_sms_enabled=False,
    )
    provider = get_phone_verification_provider(settings)

    with pytest.raises(AppHTTPException) as exc_info:
        await provider.create_verification(to_number="+18765550100", channel="sms")
    assert exc_info.value.app_code == "communications/not-configured"


def test_email_otp_table_remains_a_distinct_model() -> None:
    from db.models import AuthEmailOtpChallenge, Verification

    assert AuthEmailOtpChallenge.__tablename__ == "auth_email_otps"
    assert Verification.__tablename__ == "verifications"


def test_disabled_channel_is_rejected_before_provider_call() -> None:
    service = MobileNumberService.__new__(MobileNumberService)
    service._settings = Settings(twilio_mode="fake", twilio_verify_sms_enabled=False)

    with pytest.raises(AppHTTPException) as exc_info:
        service._require_channel("sms")
    assert exc_info.value.app_code == "communications/channel-disabled"
