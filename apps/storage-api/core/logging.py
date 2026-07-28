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
        "access_key",
        "access_key_id",
        "aws_access_key_id",
        "aws_secret_access_key",
        "authorization",
        "bucket",
        "bucket_name",
        "credentials",
        "endpoint",
        "file_name",
        "internal_key",
        "object_key",
        "original_filename",
        "original_name",
        "r2_access_key_id",
        "r2_assets_bucket",
        "r2_endpoint",
        "r2_files_bucket",
        "r2_secret_access_key",
        "scheduler_key",
        "secret",
        "secret_access_key",
        "signed_url",
        "token",
        "upload_url",
        "url",
        "x_internal_key",
        "x_scheduler_key",
    }
)


def bind_request_id(request_id: str) -> Token[str]:
    return _request_id_var.set(request_id)


def reset_request_id(token: Token[str]) -> None:
    _request_id_var.reset(token)


def get_request_id() -> str:
    return _request_id_var.get()


def _looks_signed(value: str) -> bool:
    """Whether a string carries a presigned-request signature.

    The field denylist only catches keys we thought of; a signed URL logged as
    `location`, `href`, or interpolated into a message would still leak a live
    credential. These markers are part of the SigV4 query contract, so matching
    on them catches the URL wherever it appears.
    """
    lowered = value.lower()
    return "x-amz-signature=" in lowered or "x-amz-credential=" in lowered


def _redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        return _redact(value)
    if isinstance(value, list):
        return [_redact_value(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_redact_value(item) for item in value)
    if isinstance(value, str) and _looks_signed(value):
        return "[redacted]"
    return value


def _redact(fields: dict[str, Any]) -> dict[str, Any]:
    return {
        key: "[redacted]" if key.lower() in _sensitive_fields else _redact_value(value) for key, value in fields.items()
    }


def _add_request_id(_logger: Any, _method: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def _redact_processor(_logger: Any, _method: str, event_dict: dict[str, Any]) -> dict[str, Any]:
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
