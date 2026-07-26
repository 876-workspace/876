from collections.abc import Awaitable, Callable
from dataclasses import asdict, dataclass

from core.errors import AppHTTPException, provider_error
from core.logging import get_logger, get_request_id

logger = get_logger(__name__)


@dataclass(frozen=True)
class StorageOperationContext:
    source_app_id: str | None
    actor_id: str | None
    owner_id: str | None
    file_id: str | None
    upload_session_id: str | None
    route_key: str | None


def log_storage_event(
    event: str,
    context: StorageOperationContext,
    *,
    error_code: str | None,
    level: str = "info",
    **fields: object,
) -> None:
    getattr(logger, level)(
        event,
        **asdict(context),
        request_id=get_request_id() or None,
        error_code=error_code,
        **fields,
    )


async def observe_provider_call[T](
    operation: str,
    context: StorageOperationContext,
    call: Callable[[], Awaitable[T]],
) -> T:
    try:
        return await call()
    except AppHTTPException as exc:
        log_storage_event(
            "storage.provider_error",
            context,
            error_code=exc.app_code,
            level="error",
            metric_name="provider_errors",
            metric_value=1,
            provider_operation=operation,
            provider_error_type=type(exc).__name__,
        )
        raise
    except Exception as exc:
        log_storage_event(
            "storage.provider_error",
            context,
            error_code="storage/provider-error",
            level="error",
            metric_name="provider_errors",
            metric_value=1,
            provider_operation=operation,
            provider_error_type=type(exc).__name__,
        )
        raise provider_error() from None
