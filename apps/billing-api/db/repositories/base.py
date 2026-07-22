from __future__ import annotations

from typing import Generic, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from db.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class Repository(Generic[ModelT]):
    """Base for tenant-aware repositories added with each Billing domain."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
