from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.files import File


class ResourceLink(Base):
    __tablename__ = "storage_resource_links"
    __table_args__ = (
        UniqueConstraint(
            "file_id",
            "app_id",
            "resource_type",
            "resource_id",
            "relation",
            name="uq_storage_resource_links_target",
        ),
        Index(
            "ix_storage_resource_links_resource",
            "app_id",
            "resource_type",
            "resource_id",
            "relation",
        ),
        Index("ix_storage_resource_links_file", "file_id"),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    file_id: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("storage_files.id", ondelete="CASCADE"),
        nullable=False,
    )
    app_id: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(255), nullable=False)
    relation: Mapped[str] = mapped_column(String(128), nullable=False)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    file: Mapped["File"] = relationship(back_populates="resource_links")
