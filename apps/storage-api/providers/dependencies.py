from typing import Annotated, cast

from fastapi import Depends, Request

from core.errors import provider_error
from core.observability import StorageOperationContext, log_storage_event
from providers.base import ObjectStorageProvider
from providers.r2 import R2ObjectStorageProvider


def get_provider(request: Request) -> ObjectStorageProvider:
    provider = getattr(request.app.state, "storage_provider", None)
    if provider is None:
        try:
            provider = R2ObjectStorageProvider(request.app.state.settings)
        except Exception as exc:
            # A configuration failure names only env vars, never a credential
            # value, so its message is safe to log and is the whole diagnosis.
            misconfigured = isinstance(exc, ValueError)
            log_storage_event(
                "storage.provider_error",
                StorageOperationContext(
                    source_app_id=None,
                    actor_id=None,
                    owner_id=None,
                    file_id=None,
                    upload_session_id=None,
                    route_key=None,
                ),
                error_code="storage/provider-error",
                level="error",
                metric_name="provider_errors",
                metric_value=1,
                provider_operation="initialize",
                provider_error_type=type(exc).__name__,
                provider_error_detail=str(exc) if misconfigured else None,
            )
            raise provider_error() from None
        request.app.state.storage_provider = provider
    return cast(ObjectStorageProvider, provider)


StorageProviderDep = Annotated[ObjectStorageProvider, Depends(get_provider)]
