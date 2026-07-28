from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.files import File


class UploadSession(Base):
    __tablename__ = "storage_upload_sessions"
    __table_args__ = (Index("ix_storage_upload_sessions_status", "status"),)

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    file_id: Mapped[str] = mapped_column(ForeignKey("storage_files.id", ondelete="CASCADE"), nullable=False, index=True)
    route_key: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    declared_content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    declared_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    completed_at: Mapped[int | None] = mapped_column(BigInteger)
    reservation_released_at: Mapped[int | None] = mapped_column(BigInteger)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    file: Mapped["File"] = relationship(back_populates="upload_sessions")
