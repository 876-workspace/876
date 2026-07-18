"""Structured logging configuration and request-scoped context."""

import importlib
import importlib.util
import json
import logging
import sys
from contextvars import ContextVar, Token
from typing import Any

_structlog: Any | None = None
if importlib.util.find_spec("structlog") is not None:
    _structlog = importlib.import_module("structlog")

_request_id_var: ContextVar[str] = ContextVar("request_id", default="")
_actor_var: ContextVar[dict[str, Any] | None] = ContextVar("actor", default=None)

# Field names whose values must never reach log output. Matching is
# case-insensitive on the exact field key. This is a defense-in-depth safety
# net behind the convention of never passing secrets to the logger — a single
# careless field should never emit a live credential, token, or PII secret.
_SENSITIVE_FIELD_NAMES = frozenset(
    {
        "authorization",
        "api_key",
        "apikey",
        "x_api_key",
        "x_876_api_key",
        "x_internal_key",
        "internal_key",
        "bearer_token",
        "token",
        "id_token",
        "id_token_hint",
        "refresh_token",
        "access_token",
        "client_secret",
        "client_secret_hash",
        "key_hash",
        "plaintext",
        "password",
        "new_password",
        "code",
        "code_verifier",
        "code_challenge",
        "session",
        "cookie",
        "otp_code",
        "otp",
        "secret",
    }
)
_REDACTED = "[redacted]"


def bind_request_id(request_id: str) -> Token[str]:
    """Bind a request ID to the current async context."""
    return _request_id_var.set(request_id)


def reset_request_id(token: Token[str]) -> None:
    """Reset the request ID context after a request completes."""
    _request_id_var.reset(token)


def get_request_id() -> str:
    """Return the request ID bound to the current async context."""
    return _request_id_var.get()


def bind_actor(**fields: Any) -> Token[dict[str, Any] | None]:
    """Bind acting-principal identity onto the current async context.

    Values are non-PII identifiers only (``app_id``, ``api_key_id``, ``user_id``,
    ``realm``, ``internal``). ``None`` values are ignored. A fresh dict is always
    created so the shared default is never mutated and contexts stay isolated.
    """
    current = _actor_var.get() or {}
    merged = {**current, **{k: v for k, v in fields.items() if v is not None}}
    return _actor_var.set(merged)


def reset_actor(token: Token[dict[str, Any] | None]) -> None:
    """Reset the actor context after a request completes."""
    _actor_var.reset(token)


def get_actor() -> dict[str, Any]:
    """Return the actor identity bound to the current async context."""
    return _actor_var.get() or {}


def _redact_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """Mask any field whose key is in the sensitive denylist."""
    return {
        key: (_REDACTED if key.lower() in _SENSITIVE_FIELD_NAMES else value)
        for key, value in fields.items()
    }


def _add_request_id(
    logger: Any,
    method: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def _add_actor(
    logger: Any,
    method: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    for key, value in get_actor().items():
        event_dict.setdefault(key, value)
    return event_dict


def _redact_processor(
    logger: Any,
    method: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    for key in list(event_dict.keys()):
        if key.lower() in _SENSITIVE_FIELD_NAMES:
            event_dict[key] = _REDACTED
    return event_dict


def configure_logging(environment: str = "production", log_level: str = "info") -> None:
    """Configure application logging for local readability and production JSON."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level, force=True)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    if _structlog is None:
        return

    processors: list[Any] = [
        _structlog.contextvars.merge_contextvars,
        _structlog.stdlib.add_log_level,
        _structlog.processors.TimeStamper(fmt="iso"),
        _add_request_id,
        _add_actor,
        _structlog.stdlib.PositionalArgumentsFormatter(),
        _structlog.processors.StackInfoRenderer(),
        _structlog.processors.format_exc_info,
        _redact_processor,
    ]

    if environment == "development":
        processors.append(_structlog.dev.ConsoleRenderer())
    else:
        processors.append(_structlog.processors.JSONRenderer())

    _structlog.configure(
        processors=processors,
        wrapper_class=_structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=_structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )


class _StdlibStructuredLogger:
    def __init__(self, name: str) -> None:
        self._logger = logging.getLogger(name)

    def debug(self, event: str, **fields: Any) -> None:
        self._emit(logging.DEBUG, event, **fields)

    def info(self, event: str, **fields: Any) -> None:
        self._emit(logging.INFO, event, **fields)

    def warning(self, event: str, **fields: Any) -> None:
        self._emit(logging.WARNING, event, **fields)

    def error(self, event: str, **fields: Any) -> None:
        self._emit(logging.ERROR, event, **fields)

    def _emit(self, level: int, event: str, **fields: Any) -> None:
        exc_info = bool(fields.pop("exc_info", False))
        request_id = get_request_id()
        if request_id:
            fields["request_id"] = request_id
        for key, value in get_actor().items():
            fields.setdefault(key, value)
        fields = _redact_fields(fields)

        payload = {"event": event, "level": logging.getLevelName(level).lower(), **fields}
        self._logger.log(level, json.dumps(payload, default=str), exc_info=exc_info)


def get_logger(name: str = __name__) -> Any:
    """Return a structlog logger bound to the given module name."""
    if _structlog is None:
        return _StdlibStructuredLogger(name)

    # Bind the module name into the initial context as ``logger`` via ``bind()``
    # rather than passing ``logger=name`` to ``get_logger()``. ``logger`` is a
    # reserved positional parameter of structlog's ``wrap_logger``, so passing it
    # as a ``get_logger`` kwarg raises ``TypeError: wrap_logger() got multiple
    # values for argument 'logger'`` on newer structlog (e.g. under Python 3.14).
    # Binding it as context avoids that and also avoids
    # ``structlog.stdlib.add_logger_name`` (which reads ``logger.name`` — absent
    # on the ``PrintLogger`` from ``PrintLoggerFactory`` — and crashed startup).
    return _structlog.get_logger().bind(logger=name)
