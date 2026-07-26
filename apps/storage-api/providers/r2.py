from functools import partial
from typing import Any

import anyio
import boto3  # type: ignore[import-untyped]
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import status

from core.config import Settings
from core.errors import AppHTTPException
from providers.base import (
    CreateReadUrlInput,
    CreateReadUrlOutput,
    CreateUploadUrlInput,
    CreateUploadUrlOutput,
    DeleteObjectInput,
    DeleteObjectOutput,
    HeadObjectInput,
    HeadObjectOutput,
    ObjectStorageProvider,
)


def _provider_error() -> AppHTTPException:
    return AppHTTPException(
        code="storage/provider-error",
        message="The storage provider could not complete the request.",
        http_status_code=status.HTTP_502_BAD_GATEWAY,
    )


class R2ObjectStorageProvider(ObjectStorageProvider):
    def __init__(self, settings: Settings) -> None:
        self._client: Any = boto3.client(
            "s3",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            endpoint_url=settings.r2_endpoint or None,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    async def create_upload_url(self, params: CreateUploadUrlInput) -> CreateUploadUrlOutput:
        call = partial(
            self._client.generate_presigned_url,
            "put_object",
            Params={
                "Bucket": params.bucket,
                "Key": params.object_key,
                "ContentType": params.content_type,
                "ContentLength": params.content_length,
            },
            ExpiresIn=params.expires_in,
        )
        try:
            url = await anyio.to_thread.run_sync(call)
        except (ClientError, BotoCoreError) as exc:
            raise _provider_error() from exc
        return CreateUploadUrlOutput(
            url=str(url),
            headers={
                "Content-Type": params.content_type,
                "Content-Length": str(params.content_length),
            },
        )

    async def head_object(self, params: HeadObjectInput) -> HeadObjectOutput:
        call = partial(self._client.head_object, Bucket=params.bucket, Key=params.object_key)
        try:
            response = await anyio.to_thread.run_sync(call)
        except (ClientError, BotoCoreError) as exc:
            error = exc.response.get("Error", {})
            metadata = exc.response.get("ResponseMetadata", {})
            if error.get("Code") in {"404", "NoSuchKey", "NotFound"} or metadata.get("HTTPStatusCode") == 404:
                return HeadObjectOutput(exists=False)
            raise _provider_error() from exc
        return HeadObjectOutput(
            exists=True,
            content_type=str(response.get("ContentType")) if response.get("ContentType") is not None else None,
            content_length=(int(response["ContentLength"]) if response.get("ContentLength") is not None else None),
        )

    async def create_read_url(self, params: CreateReadUrlInput) -> CreateReadUrlOutput:
        call = partial(
            self._client.generate_presigned_url,
            "get_object",
            Params={"Bucket": params.bucket, "Key": params.object_key},
            ExpiresIn=params.expires_in,
        )
        try:
            url = await anyio.to_thread.run_sync(call)
        except (ClientError, BotoCoreError) as exc:
            raise _provider_error() from exc
        return CreateReadUrlOutput(url=str(url))

    async def delete_object(self, params: DeleteObjectInput) -> DeleteObjectOutput:
        call = partial(self._client.delete_object, Bucket=params.bucket, Key=params.object_key)
        try:
            await anyio.to_thread.run_sync(call)
        except (ClientError, BotoCoreError) as exc:
            raise _provider_error() from exc
        return DeleteObjectOutput(deleted=True)
