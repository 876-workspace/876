from typing import TYPE_CHECKING

from sqlalchemy import (
    ARRAY,
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
    from db.models.auth import AuthorizationCode, OauthGrant, Session
    from db.models.features import Feature
    from db.models.modules import ApplicationModule
    from db.models.orgs import Organization
    from db.models.subscriptions import Subscription
    from db.models.users import User


class App(Base):
    __tablename__ = "apps"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    client_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    client_secret_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    client_type: Mapped[str] = mapped_column(String, nullable=False, server_default="public")
    app_kind: Mapped[str] = mapped_column(String, nullable=False, server_default="external")
    status: Mapped[str] = mapped_column(String, nullable=False, default="active", server_default="active")
    allowed_redirect_uris: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    allowed_logout_uris: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default="{}")
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    homepage_url: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False, server_default="web")
    scopes_allowed: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{openid,profile,email}"
    )
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization | None"] = relationship("Organization", back_populates="apps")
    api_keys: Mapped[list["ApiKey"]] = relationship("ApiKey", back_populates="app")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="app")
    authorization_codes: Mapped[list["AuthorizationCode"]] = relationship("AuthorizationCode", back_populates="app")
    oauth_grants: Mapped[list["OauthGrant"]] = relationship("OauthGrant", back_populates="app")
    user_enrollments: Mapped[list["UserAppEnrollment"]] = relationship("UserAppEnrollment", back_populates="app")
    features: Mapped[list["Feature"]] = relationship("Feature", back_populates="app")
    modules: Mapped[list["ApplicationModule"]] = relationship(
        "ApplicationModule", back_populates="app", cascade="all, delete-orphan"
    )
    subscriptions: Mapped[list["Subscription"]] = relationship("Subscription", back_populates="app")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_used_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    expires_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    app: Mapped["App"] = relationship("App", back_populates="api_keys")


class UserAppEnrollment(Base):
    __tablename__ = "user_app_enrollments"
    __table_args__ = (UniqueConstraint("user_id", "app_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)
    enrolled_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    last_seen_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="app_enrollments")
    app: Mapped["App"] = relationship("App", back_populates="user_enrollments")


class AppAssignment(Base):
    """Per-member app access grant inside an organization.

    An org is *provisioned* onto an app (``subscriptions``); a member is then
    *assigned* to that app. Product apps admit a member only when both exist
    and are active. Distinct from ``user_app_enrollments`` (sign-in telemetry).
    """

    __tablename__ = "app_assignments"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", "app_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    # Opaque user ID of the member who granted access; null for system grants
    # (auto-assignment during provisioning/registration).
    assigned_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization")
    user: Mapped["User"] = relationship("User")
    app: Mapped["App"] = relationship("App")
