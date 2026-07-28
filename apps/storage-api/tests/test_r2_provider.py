"""R2 provider adapter — signing contract and HEAD verification mapping."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError

from core.config import Settings
from core.errors import AppHTTPException
from providers.base import (
    CreateReadUrlInput,
    CreateUploadUrlInput,
    DeleteObjectInput,
    HeadObjectInput,
)
from providers.r2 import R2ObjectStorageProvider


def make_settings() -> Settings:
    return Settings(
        r2_access_key_id="AKIA_TEST",
        r2_secret_access_key="secret",
        r2_endpoint="https://account.r2.cloudflarestorage.com",
        r2_assets_bucket="assets",
        r2_files_bucket="files",
        environment="test",
    )


@pytest.fixture
def provider(monkeypatch: pytest.MonkeyPatch) -> tuple[R2ObjectStorageProvider, MagicMock]:
    client = MagicMock()
    boto3 = MagicMock()
    boto3.client.return_value = client
    monkeypatch.setattr("providers.r2.boto3", boto3)
    return R2ObjectStorageProvider(make_settings()), client


@pytest.mark.parametrize(
    ("access_key", "secret_key", "expected"),
    [
        ("", "secret", "R2_ACCESS_KEY_ID"),
        ("AKIA_TEST", "", "R2_SECRET_ACCESS_KEY"),
        ("", "", "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"),
    ],
)
def test_missing_credentials_fail_at_construction(
    monkeypatch: pytest.MonkeyPatch,
    access_key: str,
    secret_key: str,
    expected: str,
) -> None:
    """boto3 signs with empty credentials, producing URLs that always 400 at R2.

    Failing here keeps the cause legible instead of surfacing as an opaque
    browser-side upload rejection.
    """
    boto3 = MagicMock()
    monkeypatch.setattr("providers.r2.boto3", boto3)

    with pytest.raises(ValueError) as excinfo:
        R2ObjectStorageProvider(
            Settings(
                r2_access_key_id=access_key,
                r2_secret_access_key=secret_key,
                r2_endpoint="https://account.r2.cloudflarestorage.com",
                environment="test",
            )
        )

    assert str(excinfo.value) == f"R2 is not configured; missing: {expected}."
    assert boto3.client.call_count == 0


def test_empty_endpoint_is_passed_as_none(monkeypatch: pytest.MonkeyPatch) -> None:
    client = MagicMock()
    boto3 = MagicMock()
    boto3.client.return_value = client
    monkeypatch.setattr("providers.r2.boto3", boto3)

    R2ObjectStorageProvider(
        Settings(
            r2_access_key_id="AKIA_TEST",
            r2_secret_access_key="secret",
            r2_endpoint="",
            environment="test",
        )
    )

    kwargs = boto3.client.call_args.kwargs
    assert kwargs["endpoint_url"] is None
    assert kwargs["region_name"] == "auto"
    assert kwargs["aws_access_key_id"] == "AKIA_TEST"


def test_configured_endpoint_is_passed_through(monkeypatch: pytest.MonkeyPatch) -> None:
    client = MagicMock()
    boto3 = MagicMock()
    boto3.client.return_value = client
    monkeypatch.setattr("providers.r2.boto3", boto3)

    R2ObjectStorageProvider(make_settings())

    kwargs = boto3.client.call_args.kwargs
    assert kwargs["endpoint_url"] == "https://account.r2.cloudflarestorage.com"


@pytest.mark.asyncio
async def test_create_upload_url_signs_put_with_content_type_and_length(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider
    client.generate_presigned_url.return_value = "https://signed.example/put"

    output = await r2.create_upload_url(
        CreateUploadUrlInput(
            bucket="assets",
            object_key="organizations/org_1/branding/file_1/ver_1",
            content_type="image/png",
            content_length=100,
            expires_in=600,
        )
    )

    assert output.url == "https://signed.example/put"
    assert output.headers == {
        "Content-Type": "image/png",
        "Content-Length": "100",
    }
    client.generate_presigned_url.assert_called_once_with(
        "put_object",
        Params={
            "Bucket": "assets",
            "Key": "organizations/org_1/branding/file_1/ver_1",
            "ContentType": "image/png",
            "ContentLength": 100,
        },
        ExpiresIn=600,
    )


@pytest.mark.asyncio
async def test_create_upload_url_maps_client_error_to_provider_error(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider
    client.generate_presigned_url.side_effect = ClientError(
        {"Error": {"Code": "InternalError", "Message": "boom"}},
        "GeneratePresignedUrl",
    )

    with pytest.raises(AppHTTPException) as exc_info:
        await r2.create_upload_url(
            CreateUploadUrlInput(
                bucket="assets",
                object_key="key",
                content_type="image/png",
                content_length=1,
                expires_in=60,
            )
        )

    assert exc_info.value.app_code == "storage/provider-error"
    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_head_object_returns_exists_false_for_404_codes(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider

    for code in ("404", "NoSuchKey", "NotFound"):
        client.head_object.side_effect = ClientError(
            {"Error": {"Code": code}, "ResponseMetadata": {"HTTPStatusCode": 404}},
            "HeadObject",
        )
        output = await r2.head_object(HeadObjectInput(bucket="assets", object_key="missing"))
        assert output.exists is False
        assert output.content_type is None
        assert output.content_length is None


@pytest.mark.asyncio
async def test_head_object_returns_metadata_when_present(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider
    client.head_object.return_value = {
        "ContentType": "image/jpeg",
        "ContentLength": 2048,
    }

    output = await r2.head_object(HeadObjectInput(bucket="files", object_key="k"))

    assert output.exists is True
    assert output.content_type == "image/jpeg"
    assert output.content_length == 2048


@pytest.mark.asyncio
async def test_head_object_maps_non_404_client_error(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider
    client.head_object.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied"}, "ResponseMetadata": {"HTTPStatusCode": 403}},
        "HeadObject",
    )

    with pytest.raises(AppHTTPException) as exc_info:
        await r2.head_object(HeadObjectInput(bucket="assets", object_key="k"))

    assert exc_info.value.app_code == "storage/provider-error"


@pytest.mark.asyncio
async def test_create_read_url_signs_get_object(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider
    client.generate_presigned_url.return_value = "https://signed.example/get"

    output = await r2.create_read_url(CreateReadUrlInput(bucket="files", object_key="private/key", expires_in=300))

    assert output.url == "https://signed.example/get"
    client.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "files", "Key": "private/key"},
        ExpiresIn=300,
    )


@pytest.mark.asyncio
async def test_delete_object_returns_deleted_true(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider
    client.delete_object.return_value = {}

    output = await r2.delete_object(DeleteObjectInput(bucket="assets", object_key="k"))

    assert output.deleted is True
    client.delete_object.assert_called_once_with(Bucket="assets", Key="k")


@pytest.mark.asyncio
async def test_delete_object_maps_client_error(
    provider: tuple[R2ObjectStorageProvider, MagicMock],
) -> None:
    r2, client = provider
    client.delete_object.side_effect = ClientError(
        {"Error": {"Code": "InternalError"}},
        "DeleteObject",
    )

    with pytest.raises(AppHTTPException) as exc_info:
        await r2.delete_object(DeleteObjectInput(bucket="assets", object_key="k"))

    assert exc_info.value.app_code == "storage/provider-error"
