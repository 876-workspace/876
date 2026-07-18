import pytest

from core.rate_limit import reset_rate_limits


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Isolate the in-memory auth rate-limit windows between tests."""
    reset_rate_limits()
    yield
    reset_rate_limits()
