from typing import Any

from sqlalchemy import JSON, BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class FeatureFlagMigrationArchive(Base):
    __tablename__ = "feature_flag_migration_archives"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source_provider: Mapped[str] = mapped_column(String, nullable=False)
    target_provider: Mapped[str] = mapped_column(String, nullable=False)
    checksum: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="captured")
    counts: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    completed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
