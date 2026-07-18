from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.products import Product
    from db.models.subscription_items import SubscriptionItem


class Price(Base):
    """A specific price point on a ``Product``, mirroring Stripe's ``Price``."""

    __tablename__ = "prices"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    product_id: Mapped[str] = mapped_column(
        String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Legacy - Do not remove until migration is complete
    billing_interval: Mapped[str | None] = mapped_column(String, nullable=True)
    interval_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Legacy - stripe_price_id removed
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")

    # Modified/New Phase 1 fields
    unit_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    unit_amount_decimal: Mapped[str | None] = mapped_column(String, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="jmd")

    lookup_key: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    nickname: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False, server_default="recurring") # one_time, recurring
    billing_scheme: Mapped[str] = mapped_column(String, nullable=False, server_default="per_unit") # per_unit, tiered
    tiers_mode: Mapped[str | None] = mapped_column(String, nullable=True) # graduated, volume
    tiers: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    recurring: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    tax_behavior: Mapped[str | None] = mapped_column(String, nullable=True)
    transform_quantity: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    trial_period_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)

    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    archived_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    product: Mapped["Product"] = relationship("Product", back_populates="prices")
    subscription_items: Mapped[list["SubscriptionItem"]] = relationship(
        "SubscriptionItem", back_populates="price"
    )
