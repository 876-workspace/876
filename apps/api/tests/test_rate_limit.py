import pytest

from core.errors import AppHTTPException
from core.rate_limit import enforce_rate_limit, reset_rate_limits


def test_allows_attempts_up_to_the_limit() -> None:
    for _ in range(5):
        enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)


def test_raises_429_over_the_limit() -> None:
    for _ in range(5):
        enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)

    with pytest.raises(AppHTTPException) as excinfo:
        enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)

    assert excinfo.value.status_code == 429
    assert excinfo.value.app_code == "auth/rate-limited"


def test_keys_are_isolated_per_scope_and_key() -> None:
    for _ in range(5):
        enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)

    # Same key in another scope and another key in the same scope are unaffected.
    enforce_rate_limit("other.scope", "user@example.com", max_attempts=5, window_seconds=60)
    enforce_rate_limit("test.scope", "other@example.com", max_attempts=5, window_seconds=60)


def test_window_expiry_resets_the_count(monkeypatch) -> None:
    clock = {"now": 1_700_000_000}
    monkeypatch.setattr("core.rate_limit.time.time", lambda: clock["now"])

    for _ in range(5):
        enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)

    clock["now"] += 60
    enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)


def test_reset_clears_all_state() -> None:
    for _ in range(5):
        enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)

    reset_rate_limits()
    enforce_rate_limit("test.scope", "user@example.com", max_attempts=5, window_seconds=60)
