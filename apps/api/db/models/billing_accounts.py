from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    BigInteger,
    ForeignKey,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.orgs import Organization
    from db.models.subscriptions import Subscription


class BillingAccount(Base):
    """The billable customer profile, linked to an Organization."""

    __tablename__ = "billing_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    invoice_email: Mapped[str | None] = mapped_column(String, nullable=True)
    currency: Mapped[str | None] = mapped_column(
        String(3), nullable=True, server_default="JMD"
    )
    tax_exempt: Mapped[str | None] = mapped_column(String, nullable=True)
    balance: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    default_payment_method_id: Mapped[str | None] = mapped_column(String, nullable=True)

    invoice_settings: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    preferred_locales: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    address: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    shipping: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)

    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization")
    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription", back_populates="billing_account"
    )
