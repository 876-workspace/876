from typing import Annotated, cast

from fastapi import Depends, Request

from providers.base import ObjectStorageProvider
from providers.r2 import R2ObjectStorageProvider


def get_provider(request: Request) -> ObjectStorageProvider:
    provider = getattr(request.app.state, "storage_provider", None)
    if provider is None:
        provider = R2ObjectStorageProvider(request.app.state.settings)
        request.app.state.storage_provider = provider
    return cast(ObjectStorageProvider, provider)


StorageProviderDep = Annotated[ObjectStorageProvider, Depends(get_provider)]
