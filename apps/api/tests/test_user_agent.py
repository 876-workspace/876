from __future__ import annotations

import pytest

from core.user_agent import ParsedUserAgent, parse_user_agent, refine_with_client_hints

IPHONE_SAFARI = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1"
)
IPAD_SAFARI = (
    "Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1"
)
SAMSUNG_CHROME = (
    "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Mobile Safari/537.36"
)
PIXEL_CHROME = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Mobile Safari/537.36"
)
ANDROID_TABLET = (
    "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/129.0.0.0 Safari/537.36"
)
WINDOWS_CHROME = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)
WINDOWS_EDGE = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
)
MAC_SAFARI = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.1 Safari/605.1.15"
)
LINUX_FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0"
GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
CURL = "curl/8.5.0"


class TestParseUserAgent:
    def test_returns_empty_parse_for_missing_user_agent(self) -> None:
        assert parse_user_agent(None) == ParsedUserAgent(
            "other", None, None, None, None, None, None, False
        )
        assert parse_user_agent("") == ParsedUserAgent(
            "other", None, None, None, None, None, None, False
        )

    def test_parses_iphone_safari_as_mobile_apple(self) -> None:
        parsed = parse_user_agent(IPHONE_SAFARI)

        assert parsed.device_type == "mobile"
        assert parsed.device_brand == "Apple"
        assert parsed.device_model == "iPhone"
        assert parsed.os_name == "iOS"
        assert parsed.os_version == "18.2"
        assert parsed.browser_name == "Mobile Safari"
        assert parsed.is_bot is False

    def test_parses_ipad_as_tablet(self) -> None:
        parsed = parse_user_agent(IPAD_SAFARI)

        assert parsed.device_type == "tablet"
        assert parsed.device_brand == "Apple"
        assert parsed.os_name == "iOS"

    def test_parses_samsung_handset_model(self) -> None:
        parsed = parse_user_agent(SAMSUNG_CHROME)

        assert parsed.device_type == "mobile"
        assert parsed.device_brand == "Samsung"
        assert parsed.device_model == "SM-S928B"
        assert parsed.os_name == "Android"
        assert parsed.os_version == "15"
        assert parsed.browser_name == "Chrome Mobile"
        assert parsed.browser_version == "131.0.0"

    def test_parses_pixel_handset_model(self) -> None:
        parsed = parse_user_agent(PIXEL_CHROME)

        assert parsed.device_brand == "Google"
        assert parsed.device_model == "Pixel 8 Pro"
        assert parsed.os_version == "14"

    def test_treats_android_without_mobile_token_as_tablet(self) -> None:
        parsed = parse_user_agent(ANDROID_TABLET)

        assert parsed.device_type == "tablet"
        assert parsed.os_name == "Android"

    def test_parses_windows_chrome_as_desktop(self) -> None:
        parsed = parse_user_agent(WINDOWS_CHROME)

        assert parsed.device_type == "desktop"
        assert parsed.os_name == "Windows"
        assert parsed.browser_name == "Chrome"
        assert parsed.browser_version == "131.0.0"
        assert parsed.is_bot is False

    def test_distinguishes_edge_from_chrome(self) -> None:
        assert parse_user_agent(WINDOWS_EDGE).browser_name == "Edge"

    def test_parses_mac_safari_as_desktop(self) -> None:
        parsed = parse_user_agent(MAC_SAFARI)

        assert parsed.device_type == "desktop"
        assert parsed.os_name == "Mac OS X"
        assert parsed.browser_name == "Safari"

    def test_parses_linux_firefox_as_desktop(self) -> None:
        parsed = parse_user_agent(LINUX_FIREFOX)

        assert parsed.device_type == "desktop"
        assert parsed.browser_name == "Firefox"
        assert parsed.browser_version == "133.0"

    @pytest.mark.parametrize("user_agent", [GOOGLEBOT, CURL])
    def test_flags_bots(self, user_agent: str) -> None:
        parsed = parse_user_agent(user_agent)

        assert parsed.is_bot is True
        assert parsed.device_type == "bot"

    def test_never_raises_on_garbage_input(self) -> None:
        assert parse_user_agent("\x00\x01 not a user agent \ud800").device_type in {
            "other",
            "desktop",
            "mobile",
            "tablet",
            "bot",
        }


class TestRefineWithClientHints:
    def test_returns_parsed_unchanged_without_hints(self) -> None:
        parsed = parse_user_agent(IPHONE_SAFARI)

        assert refine_with_client_hints(parsed, None) == parsed
        assert refine_with_client_hints(parsed, {}) == parsed

    def test_hint_platform_version_overrides_user_agent_version(self) -> None:
        parsed = parse_user_agent(SAMSUNG_CHROME)

        refined = refine_with_client_hints(parsed, {"platformVersion": "15.0.0"})

        assert refined.os_version == "15.0.0"
        assert parsed.os_version == "15"

    def test_hint_model_overrides_user_agent_model(self) -> None:
        parsed = parse_user_agent(IPHONE_SAFARI)

        refined = refine_with_client_hints(parsed, {"model": "iPhone16,2"})

        assert refined.device_model == "iPhone16,2"

    def test_ignores_blank_hints(self) -> None:
        parsed = parse_user_agent(SAMSUNG_CHROME)

        refined = refine_with_client_hints(parsed, {"model": "   ", "platformVersion": ""})

        assert refined.device_model == parsed.device_model
        assert refined.os_version == parsed.os_version

    def test_skips_filler_brand_when_picking_full_version(self) -> None:
        parsed = parse_user_agent(WINDOWS_CHROME)

        refined = refine_with_client_hints(
            parsed,
            {
                "fullVersionList": [
                    {"brand": "Not_A Brand", "version": "99.0.0.0"},
                    {"brand": "Chromium", "version": "131.0.6778.86"},
                    {"brand": "Google Chrome", "version": "131.0.6778.86"},
                ]
            },
        )

        assert refined.browser_version == "131.0.6778.86"

    def test_matches_full_version_entry_to_parsed_browser_name(self) -> None:
        parsed = parse_user_agent(WINDOWS_EDGE)

        refined = refine_with_client_hints(
            parsed,
            {
                "fullVersionList": [
                    {"brand": "Not_A Brand", "version": "99.0.0.0"},
                    {"brand": "Microsoft Edge", "version": "131.0.2903.86"},
                    {"brand": "Chromium", "version": "131.0.6778.86"},
                ]
            },
        )

        assert refined.browser_version == "131.0.2903.86"

    def test_ignores_full_version_list_of_only_filler_brands(self) -> None:
        parsed = parse_user_agent(WINDOWS_CHROME)

        refined = refine_with_client_hints(
            parsed, {"fullVersionList": [{"brand": "Not.A/Brand", "version": "99.0.0.0"}]}
        )

        assert refined.browser_version == parsed.browser_version

    def test_mobile_hint_reclassifies_unknown_device_type(self) -> None:
        parsed = ParsedUserAgent("other", None, None, None, None, None, None, False)

        assert refine_with_client_hints(parsed, {"mobile": True}).device_type == "mobile"
        assert refine_with_client_hints(parsed, {"mobile": False}).device_type == "desktop"

    def test_mobile_hint_never_overrides_a_bot_classification(self) -> None:
        parsed = parse_user_agent(GOOGLEBOT)

        assert refine_with_client_hints(parsed, {"mobile": False}).device_type == "bot"
