from sqlalchemy import BigInteger, CheckConstraint, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class BillingCustomerOutbox(Base):
    """Durable customer snapshots awaiting delivery to 876 Billing."""

    __tablename__ = "billing_customer_outbox"
    __table_args__ = (
        CheckConstraint(
            "event_type = 'customer.ensure'",
            name="billing_customer_outbox_event_type_check",
        ),
        CheckConstraint(
            "subject_type IN ('organization', 'user')",
            name="billing_customer_outbox_subject_type_check",
        ),
        CheckConstraint(
            "status IN ('pending', 'processing', 'delivered', 'failed')",
            name="billing_customer_outbox_status_check",
        ),
        Index(
            "ix_billing_customer_outbox_delivery",
            "status",
            "available_at",
            "created_at",
        ),
        Index(
            "ix_billing_customer_outbox_subject",
            "subject_type",
            "subject_id",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    occurred_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False)
    available_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    locked_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    delivered_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
