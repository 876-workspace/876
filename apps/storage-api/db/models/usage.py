from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class StorageUsage(Base):
    __tablename__ = "storage_usage"

    subject_type: Mapped[str] = mapped_column(String(32), primary_key=True)
    subject_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    bytes_used: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    bytes_reserved: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    files_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    recomputed_at: Mapped[int | None] = mapped_column(BigInteger)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
