from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class CreateUploadUrlInput:
    bucket: str
    object_key: str
    content_type: str
    content_length: int
    expires_in: int


@dataclass(frozen=True)
class CreateUploadUrlOutput:
    url: str
    headers: dict[str, str]


@dataclass(frozen=True)
class HeadObjectInput:
    bucket: str
    object_key: str


@dataclass(frozen=True)
class HeadObjectOutput:
    exists: bool
    content_type: str | None = None
    content_length: int | None = None


@dataclass(frozen=True)
class CreateReadUrlInput:
    bucket: str
    object_key: str
    expires_in: int


@dataclass(frozen=True)
class CreateReadUrlOutput:
    url: str


@dataclass(frozen=True)
class DeleteObjectInput:
    bucket: str
    object_key: str


@dataclass(frozen=True)
class DeleteObjectOutput:
    deleted: bool


class ObjectStorageProvider(ABC):
    @abstractmethod
    async def create_upload_url(self, params: CreateUploadUrlInput) -> CreateUploadUrlOutput:
        raise NotImplementedError

    @abstractmethod
    async def head_object(self, params: HeadObjectInput) -> HeadObjectOutput:
        raise NotImplementedError

    @abstractmethod
    async def create_read_url(self, params: CreateReadUrlInput) -> CreateReadUrlOutput:
        raise NotImplementedError

    @abstractmethod
    async def delete_object(self, params: DeleteObjectInput) -> DeleteObjectOutput:
        raise NotImplementedError
