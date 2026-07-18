from sqlalchemy import (
    ARRAY,
    BigInteger,
    CheckConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class FinanceProvisioningOutbox(Base):
    """Durable Core-to-Billing finance workspace lifecycle event.

    The row owns immutable organization and entitlement snapshots rather than
    foreign keys. Subscription or organization cleanup therefore cannot erase
    an event that Billing has not acknowledged yet.
    """

    __tablename__ = "finance_provisioning_outbox"
    __table_args__ = (
        UniqueConstraint("aggregate_id", "lifecycle_version"),
        CheckConstraint(
            "event_type = 'finance_connection.ensure'",
            name="finance_provisioning_outbox_event_type_check",
        ),
        CheckConstraint(
            "desired_status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')",
            name="finance_provisioning_outbox_desired_status_check",
        ),
        CheckConstraint(
            "status IN ('pending', 'processing', 'delivered', 'failed')",
            name="finance_provisioning_outbox_status_check",
        ),
        CheckConstraint(
            "contract_version > 0 AND provisioning_version > 0 AND lifecycle_version > 0",
            name="finance_provisioning_outbox_versions_check",
        ),
        CheckConstraint(
            "cardinality(scopes) > 0",
            name="finance_provisioning_outbox_scopes_check",
        ),
        Index(
            "ix_finance_provisioning_outbox_delivery",
            "status",
            "available_at",
            "created_at",
        ),
        Index(
            "ix_finance_provisioning_outbox_aggregate",
            "aggregate_id",
            "lifecycle_version",
        ),
        Index(
            "uq_finance_provisioning_outbox_run_id",
            "run_id",
            unique=True,
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    contract_version: Mapped[int] = mapped_column(Integer, nullable=False)
    aggregate_id: Mapped[str] = mapped_column(String, nullable=False)
    organization_id: Mapped[str] = mapped_column(String, nullable=False)
    organization_name: Mapped[str] = mapped_column(String, nullable=False)
    organization_slug: Mapped[str] = mapped_column(String, nullable=False)
    organization_country_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    organization_currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    source_app_id: Mapped[str] = mapped_column(String, nullable=False)
    entitlement_reference: Mapped[str] = mapped_column(String, nullable=False)
    provisioning_version: Mapped[int] = mapped_column(Integer, nullable=False)
    lifecycle_version: Mapped[int] = mapped_column(Integer, nullable=False)
    desired_status: Mapped[str] = mapped_column(String, nullable=False)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    occurred_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    status: Mapped[str] = mapped_column(String, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False)
    available_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    locked_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    delivered_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
