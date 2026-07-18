from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.apps import App
    from db.models.modules import PlanModule
    from db.models.prices import Price
    from db.models.taxes import TaxCode


class Product(Base):
    """Catalog of subscribable products, mirroring Stripe's ``Product``."""

    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    app_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Legacy - Do not remove until migration is complete
    # Legacy - stripe_product_id removed
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")

    # New Phase 1 fields
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    statement_descriptor: Mapped[str | None] = mapped_column(String, nullable=True)
    unit_label: Mapped[str | None] = mapped_column(String, nullable=True)
    tax_code_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("tax_codes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    lookup_key: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)

    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    archived_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    app: Mapped["App | None"] = relationship("App")
    tax_code: Mapped["TaxCode | None"] = relationship("TaxCode", back_populates="products")
    prices: Mapped[list["Price"]] = relationship("Price", back_populates="product", order_by="Price.created_at.asc()")
    module_entitlements: Mapped[list["PlanModule"]] = relationship(
        "PlanModule",
        back_populates="product",
        order_by="PlanModule.created_at.asc()",
        cascade="all, delete-orphan",
    )
