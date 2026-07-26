from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.upload_sessions import UploadSession


class File(Base):
    __tablename__ = "files"
    __table_args__ = (
        # Drive browses an owner's files filtered by category, so the browse
        # predicate is indexed alongside the owner. A leftmost prefix of this
        # index still serves owner-only lookups.
        Index("ix_files_owner_category", "owner_type", "owner_id", "category"),
        Index("ix_files_source_purpose", "source_app_id", "purpose"),
        Index("ix_files_status", "status"),
        Index("ix_files_audience", "audience"),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    owner_type: Mapped[str] = mapped_column(String(32), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    source_app_id: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="attachment")
    audience: Mapped[str] = mapped_column(String(32), nullable=False, default="private")
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    object_key: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    version_id: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(1024), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger)
    deleted_by: Mapped[str | None] = mapped_column(String(255))
    deletion_reason: Mapped[str | None] = mapped_column(String(1024))

    upload_sessions: Mapped[list["UploadSession"]] = relationship(
        back_populates="file",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
