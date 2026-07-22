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
_sensitive_fields = frozenset(
    {
        "access_token",
        "api_key",
        "authorization",
        "cookie",
        "internal_key",
        "password",
        "refresh_token",
        "secret",
        "session",
        "token",
        "x_876_api_key",
        "x_internal_key",
    }
)


def bind_request_id(request_id: str) -> Token[str]:
    return _request_id_var.set(request_id)


def reset_request_id(token: Token[str]) -> None:
    _request_id_var.reset(token)


def get_request_id() -> str:
    return _request_id_var.get()


def _redact(fields: dict[str, Any]) -> dict[str, Any]:
    return {key: "[redacted]" if key.lower() in _sensitive_fields else value for key, value in fields.items()}


def _add_request_id(logger: Any, method: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def _redact_processor(logger: Any, method: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    return _redact(event_dict)


def configure_logging(environment: str, log_level: str) -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level, force=True)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    if _structlog is None:
        return

    processors: list[Any] = [
        _structlog.stdlib.add_log_level,
        _structlog.processors.TimeStamper(fmt="iso"),
        _add_request_id,
        _structlog.processors.StackInfoRenderer(),
        _structlog.processors.format_exc_info,
        _redact_processor,
    ]
    processors.append(
        _structlog.dev.ConsoleRenderer() if environment == "development" else _structlog.processors.JSONRenderer()
    )
    _structlog.configure(
        processors=processors,
        wrapper_class=_structlog.make_filtering_bound_logger(level),
        logger_factory=_structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )


class _FallbackLogger:
    def __init__(self, name: str) -> None:
        self._logger = logging.getLogger(name)

    def info(self, event: str, **fields: Any) -> None:
        self._emit(logging.INFO, event, fields)

    def warning(self, event: str, **fields: Any) -> None:
        self._emit(logging.WARNING, event, fields)

    def error(self, event: str, **fields: Any) -> None:
        self._emit(logging.ERROR, event, fields)

    def _emit(self, level: int, event: str, fields: dict[str, Any]) -> None:
        exc_info = bool(fields.pop("exc_info", False))
        request_id = get_request_id()
        if request_id:
            fields["request_id"] = request_id
        payload = {"event": event, "level": logging.getLevelName(level).lower(), **_redact(fields)}
        self._logger.log(level, json.dumps(payload, default=str), exc_info=exc_info)


def get_logger(name: str) -> Any:
    if _structlog is None:
        return _FallbackLogger(name)
    return _structlog.get_logger().bind(logger=name)
