from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class BillingProviderObject(Base):
    """Maps internal objects (like BillingAccount) to external provider objects (like Stripe Customer)."""

    __tablename__ = "billing_provider_objects"
    __table_args__ = (
        UniqueConstraint("provider", "provider_object_type", "provider_object_id", name="uq_provider_object"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)  # e.g., 'stripe'
    provider_object_type: Mapped[str] = mapped_column(String, nullable=False)  # e.g., 'customer', 'subscription'
    provider_object_id: Mapped[str] = mapped_column(String, nullable=False)

    internal_object_type: Mapped[str] = mapped_column(String, nullable=False)  # e.g., 'billing_account'
    internal_object_id: Mapped[str] = mapped_column(String, nullable=False)

    livemode: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    synced_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    raw_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
