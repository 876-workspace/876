from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    ARRAY,
    JSON,
    BigInteger,
    Boolean,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.apps import App
    from db.models.modules import ApplicationModule
    from db.models.orgs import Organization
    from db.models.users import User


class Feature(Base):
    __tablename__ = "features"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider: Mapped[str] = mapped_column(String, nullable=False, server_default="posthog")
    provider_feature_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    provider_environment_id: Mapped[str | None] = mapped_column(String, nullable=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default="{}")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    default_value: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    value_type: Mapped[str | None] = mapped_column(String, nullable=True)
    value: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    server_side_only: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    archived_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    parent_feature_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("features.id", ondelete="SET NULL"), nullable=True, index=True
    )
    provider_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    consumer_default_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    scope: Mapped[str] = mapped_column(String, nullable=False, server_default="global")
    app_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("apps.id", ondelete="SET NULL"), nullable=True, index=True
    )
    synced_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    app: Mapped["App | None"] = relationship("App", back_populates="features")
    parent: Mapped["Feature | None"] = relationship(
        "Feature",
        remote_side="Feature.id",
        back_populates="children",
    )
    children: Mapped[list["Feature"]] = relationship(
        "Feature",
        back_populates="parent",
    )
    users: Mapped[list["UserFeature"]] = relationship("UserFeature", back_populates="feature")
    orgs: Mapped[list["OrgFeature"]] = relationship("OrgFeature", back_populates="feature")
    modules: Mapped[list["ApplicationModule"]] = relationship("ApplicationModule", back_populates="feature")


class UserFeature(Base):
    __tablename__ = "user_features"
    __table_args__ = (UniqueConstraint("user_id", "feature_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    feature_id: Mapped[str] = mapped_column(String, ForeignKey("features.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="enabled")
    note: Mapped[str | None] = mapped_column(String, nullable=True)
    synced_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="features")
    feature: Mapped["Feature"] = relationship("Feature", back_populates="users")


class OrgFeature(Base):
    __tablename__ = "org_features"
    __table_args__ = (UniqueConstraint("organization_id", "feature_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    feature_id: Mapped[str] = mapped_column(String, ForeignKey("features.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="enabled")
    note: Mapped[str | None] = mapped_column(String, nullable=True)
    synced_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="features")
    feature: Mapped["Feature"] = relationship("Feature", back_populates="orgs")
