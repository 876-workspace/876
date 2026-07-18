from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    BigInteger,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.prices import Price
    from db.models.subscriptions import Subscription


class SubscriptionItem(Base):
    """A line item on a ``Subscription``, mirroring Stripe's ``SubscriptionItem``."""

    __tablename__ = "subscription_items"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    subscription_id: Mapped[str] = mapped_column(
        String, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    price_id: Mapped[str] = mapped_column(
        String, ForeignKey("prices.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")

    billing_thresholds: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)

    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    subscription: Mapped["Subscription"] = relationship("Subscription", back_populates="items")
    price: Mapped["Price"] = relationship("Price", back_populates="subscription_items")
