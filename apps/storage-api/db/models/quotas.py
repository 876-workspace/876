from sqlalchemy import BigInteger, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class StorageQuota(Base):
    __tablename__ = "storage_quotas"
    __table_args__ = (
        UniqueConstraint(
            "subject_type",
            "subject_id",
            name="uq_storage_quotas_subject",
        ),
        Index("ix_storage_quotas_parent_org", "parent_org_id"),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    subject_type: Mapped[str] = mapped_column(String(32), nullable=False)
    subject_id: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_org_id: Mapped[str | None] = mapped_column(String(255))
    limit_bytes: Mapped[int | None] = mapped_column(BigInteger)
    max_file_bytes: Mapped[int | None] = mapped_column(BigInteger)
    default_user_limit_bytes: Mapped[int | None] = mapped_column(BigInteger)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    plan_product_id: Mapped[str | None] = mapped_column(String(255))
    plan_slug: Mapped[str | None] = mapped_column(String(255))
    plan_name: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    entitlement_version: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
