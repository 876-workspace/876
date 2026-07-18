from typing import TYPE_CHECKING, Any

from sqlalchemy import (
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
    from db.models.apps import UserAppEnrollment
    from db.models.auth import AuthorizationCode, AuthProvider, OauthGrant, Session, SsoIdentity
    from db.models.contacts import Address, Contact, UserSocialProfile
    from db.models.features import UserFeature
    from db.models.orgs import Membership


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workos_user_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, nullable=False, server_default="user")
    platform_role: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    private_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    banned: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    banned_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    profile: Mapped["UserProfile | None"] = relationship("UserProfile", back_populates="user", uselist=False)
    accounts: Mapped[list["Account"]] = relationship("Account", back_populates="user")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user")
    memberships: Mapped[list["Membership"]] = relationship("Membership", back_populates="user")
    authorization_codes: Mapped[list["AuthorizationCode"]] = relationship("AuthorizationCode", back_populates="user")
    oauth_grants: Mapped[list["OauthGrant"]] = relationship("OauthGrant", back_populates="user")
    app_enrollments: Mapped[list["UserAppEnrollment"]] = relationship("UserAppEnrollment", back_populates="user")
    features: Mapped[list["UserFeature"]] = relationship("UserFeature", back_populates="user")
    addresses: Mapped[list["Address"]] = relationship("Address", back_populates="user")
    emails: Mapped[list["UserEmail"]] = relationship("UserEmail", back_populates="user")
    mobile_numbers: Mapped[list["UserMobileNumber"]] = relationship(
        "UserMobileNumber", back_populates="user"
    )
    owned_contacts: Mapped[list["Contact"]] = relationship(
        "Contact",
        foreign_keys="Contact.owner_user_id",
        back_populates="owner",
    )
    saved_by_contacts: Mapped[list["Contact"]] = relationship(
        "Contact",
        foreign_keys="Contact.contact_user_id",
        back_populates="contact_user",
    )
    social_profiles: Mapped[list["UserSocialProfile"]] = relationship("UserSocialProfile", back_populates="user")
    sso_identities: Mapped[list["SsoIdentity"]] = relationship("SsoIdentity", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    nickname: Mapped[str | None] = mapped_column(String, nullable=True)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str | None] = mapped_column(String, nullable=True)
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    country_code: Mapped[str | None] = mapped_column(
        String(2), ForeignKey("countries.code", ondelete="SET NULL"), nullable=True
    )
    phone_number: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="profile")


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("provider_id", "account_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    account_id: Mapped[str] = mapped_column(String, nullable=False)
    provider_id: Mapped[str] = mapped_column(String, ForeignKey("auth_providers.id"), nullable=False)
    provider_type: Mapped[str] = mapped_column(String, nullable=False, server_default="oauth")
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token_expires_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    refresh_token_expires_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    scope: Mapped[str | None] = mapped_column(String, nullable=True)
    id_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    password: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="accounts")
    provider: Mapped["AuthProvider | None"] = relationship("AuthProvider")


class UserEmail(Base):
    """A secondary email address on a user account. The primary/auth email stays `users.email`."""

    __tablename__ = "user_emails"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # Verification lifecycle: unverified → pending (challenge issued) → verified.
    # The active challenge lives in the `verifications` table.
    verification_status: Mapped[str] = mapped_column(String, nullable=False, server_default="unverified")
    verification_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("verifications.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="emails")


class UserMobileNumber(Base):
    """A phone number on a user account, typed (mobile/home/work/other) with one primary."""

    __tablename__ = "user_mobile_numbers"
    __table_args__ = (UniqueConstraint("user_id", "number"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    number: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False, server_default="mobile")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # Verification lifecycle: unverified → pending (challenge issued) → verified.
    # The active challenge lives in the `verifications` table.
    verification_status: Mapped[str] = mapped_column(String, nullable=False, server_default="unverified")
    verification_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("verifications.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="mobile_numbers")


class ReservedUsername(Base):
    """Usernames that may never be claimed by a user (system, support, routing,
    legal/brand terms). Matched case-insensitively; rows are stored lowercase."""

    __tablename__ = "reserved_usernames"

    username: Mapped[str] = mapped_column(String, primary_key=True)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
