import importlib.util

import pytest

from core.logging import get_logger


def test_get_logger_does_not_raise_on_logger_name() -> None:
    """Regression: binding the module name must not collide with structlog's
    reserved ``logger`` parameter.

    Passing ``logger=name`` to ``structlog.get_logger()`` raised
    ``TypeError: wrap_logger() got multiple values for argument 'logger'`` on
    structlog >=24 and crashed app startup at the first ``get_logger`` call.
    """
    logger = get_logger("db.session")
    # Emitting a record must not raise either (the original crash was lazy).
    logger.info("startup.test", foo="bar")


@pytest.mark.skipif(
    importlib.util.find_spec("structlog") is None,
    reason="structlog not installed; the stdlib fallback path is used",
)
def test_get_logger_binds_logger_name_in_context() -> None:
    logger = get_logger("api.v1")
    # structlog binds initial context onto the proxy; the module name must be
    # present so log lines are attributable.
    assert logger._context.get("logger") == "api.v1"
