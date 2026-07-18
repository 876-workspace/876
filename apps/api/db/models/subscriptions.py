from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.apps import App
    from db.models.billing_accounts import BillingAccount
    from db.models.orgs import Organization
    from db.models.subscription_items import SubscriptionItem


class Subscription(Base):
    """An organization's subscription to an app, mirroring Stripe's ``Subscription``."""

    __tablename__ = "subscriptions"
    # Note: Removed the hard (organization_id, app_id) unique constraint per Phase 1 recommendations,
    # as Stripe allows multiple subscriptions. This should be enforced in service logic if needed.

    id: Mapped[str] = mapped_column(String, primary_key=True)

    # The direct owner is now billing_account_id, but we keep organization_id for platform lookups.
    billing_account_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("billing_accounts.id", ondelete="CASCADE"), nullable=True, index=True
    )
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)

    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    provider_status: Mapped[str | None] = mapped_column(String, nullable=True)
    status_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    collection_method: Mapped[str] = mapped_column(String, nullable=False, server_default="charge_automatically")
    billing_cycle_anchor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    current_period_start: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    current_period_end: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    cancel_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    canceled_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    ended_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    pause_collection: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    trial_start: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    trial_end: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    start_date: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    default_payment_method_id: Mapped[str | None] = mapped_column(String, nullable=True)
    latest_invoice_id: Mapped[str | None] = mapped_column(String, nullable=True)
    pending_update: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    schedule_id: Mapped[str | None] = mapped_column(String, nullable=True)

    # Legacy - stripe_subscription_id removed

    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)

    # Latest embedded-finance connection revision this entitlement contributed
    # to. Multiple subscriptions for one org/app share one connection sequence.
    finance_lifecycle_version: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    billing_account: Mapped["BillingAccount | None"] = relationship("BillingAccount", back_populates="subscriptions")
    organization: Mapped["Organization"] = relationship("Organization", back_populates="subscriptions")
    app: Mapped["App"] = relationship("App", back_populates="subscriptions")
    items: Mapped[list["SubscriptionItem"]] = relationship(
        "SubscriptionItem", back_populates="subscription", order_by="SubscriptionItem.created_at.asc()"
    )

    __table_args__ = (
        Index("ix_subscriptions_org_app", "organization_id", "app_id"),
        Index("ix_subscriptions_finance_lifecycle_version", "finance_lifecycle_version"),
    )
