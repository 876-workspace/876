from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.apps import App
    from db.models.features import Feature
    from db.models.products import Product


class ApplicationModule(Base):
    """A durable, plan-entitled product capability.

    Modules are commercial capabilities such as Payroll or Delivery. An
    optional feature flag remains an operational rollout/kill switch; it is
    not the entitlement itself.
    """

    __tablename__ = "application_modules"
    __table_args__ = (
        UniqueConstraint("app_id", "key", name="uq_application_modules_app_key"),
        Index(
            "uq_application_modules_app_feature",
            "app_id",
            "feature_id",
            unique=True,
            postgresql_where=text("feature_id IS NOT NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    feature_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("features.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    app: Mapped["App"] = relationship("App", back_populates="modules")
    feature: Mapped["Feature | None"] = relationship("Feature", back_populates="modules")
    plan_entitlements: Mapped[list["PlanModule"]] = relationship(
        "PlanModule", back_populates="module", cascade="all, delete-orphan"
    )


class PlanModule(Base):
    __tablename__ = "plan_modules"
    __table_args__ = (UniqueConstraint("product_id", "module_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    product_id: Mapped[str] = mapped_column(
        String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    module_id: Mapped[str] = mapped_column(
        String, ForeignKey("application_modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="module_entitlements")
    module: Mapped["ApplicationModule"] = relationship("ApplicationModule", back_populates="plan_entitlements")
