from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, BigInteger, Boolean, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.products import Product


class TaxCode(Base):
    """Product tax classification, aligned with Stripe's Tax Code object."""

    __tablename__ = "tax_codes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="tax_code")


class TaxRate(Base):
    """Reusable manual tax rate, aligned with Stripe's Tax Rate object."""

    __tablename__ = "tax_rates"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    inclusive: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    state: Mapped[str | None] = mapped_column(String, nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String, nullable=True)
    jurisdiction_level: Mapped[str | None] = mapped_column(String, nullable=True)
    tax_type: Mapped[str | None] = mapped_column(String, nullable=True)
    rate_type: Mapped[str | None] = mapped_column(String, nullable=True)
    flat_amount: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
