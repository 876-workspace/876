from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    ARRAY,
    JSON,
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.apps import App
    from db.models.orgs import Organization
    from db.models.users import User


class AuthProvider(Base):
    __tablename__ = "auth_providers"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    label: Mapped[str] = mapped_column(String, nullable=False)
    icon_slug: Mapped[str] = mapped_column(String, nullable=False)
    provider_type: Mapped[str] = mapped_column(String, nullable=False, server_default="oauth")
    workos_provider_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    app_id: Mapped[str | None] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=True)
    token: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="sessions")
    app: Mapped["App | None"] = relationship("App", back_populates="sessions")


class InviteToken(Base):
    __tablename__ = "invite_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, server_default="member")
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="pending")
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # App the invite was issued from (e.g. Couriers). On accept the new member
    # is auto-assigned to this app in addition to the Enterprise directory app.
    source_app_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("apps.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization")


class AuthorizationCode(Base):
    __tablename__ = "authorization_codes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    org_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    redirect_uri: Mapped[str] = mapped_column(String, nullable=False)
    code_challenge: Mapped[str] = mapped_column(String, nullable=False)
    code_challenge_method: Mapped[str] = mapped_column(String, nullable=False, server_default="S256")
    scope: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str | None] = mapped_column(String, nullable=True)
    nonce: Mapped[str | None] = mapped_column(String, nullable=True)
    auth_time: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    used_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="authorization_codes")
    app: Mapped["App"] = relationship("App", back_populates="authorization_codes")


class OauthGrant(Base):
    __tablename__ = "oauth_grants"
    __table_args__ = (UniqueConstraint("user_id", "app_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    revoked_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="oauth_grants")
    app: Mapped["App"] = relationship("App", back_populates="oauth_grants")


class OauthRefreshToken(Base):
    __tablename__ = "oauth_refresh_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    app_id: Mapped[str] = mapped_column(String, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True
    )
    scope: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    used_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    revoked_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class SsoConnection(Base):
    __tablename__ = "sso_connections"
    __table_args__ = (UniqueConstraint("provider_id", "external_connection_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(String, ForeignKey("auth_providers.id"), nullable=False)
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    external_connection_id: Mapped[str] = mapped_column(String, nullable=False)
    external_organization_id: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    domain: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    raw_provider_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    last_synced_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class SsoIdentity(Base):
    __tablename__ = "sso_identities"
    __table_args__ = (UniqueConstraint("provider_id", "external_identity_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider_id: Mapped[str] = mapped_column(String, ForeignKey("auth_providers.id"), nullable=False)
    connection_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("sso_connections.id", ondelete="SET NULL"), nullable=True
    )
    external_identity_id: Mapped[str] = mapped_column(String, nullable=False)
    external_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    username: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    raw_provider_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    last_synced_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="sso_identities")


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    identifier: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class AuthEmailOtpChallenge(Base):
    __tablename__ = "auth_email_otps"

    email: Mapped[str] = mapped_column(String, primary_key=True)
    pending_auth_token: Mapped[str] = mapped_column(String, nullable=False)
    email_verification_id: Mapped[str] = mapped_column(String, nullable=False)
    workos_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    last_sent_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    can_resend_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    send_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    verified_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
