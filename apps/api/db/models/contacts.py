from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.geo import Country, Region
    from db.models.orgs import Organization
    from db.models.users import User


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    type: Mapped[str] = mapped_column(String, nullable=False, server_default="other")
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    line1: Mapped[str | None] = mapped_column(String, nullable=True)
    line2: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    region_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("regions.id", ondelete="SET NULL"), nullable=True
    )
    country_code: Mapped[str | None] = mapped_column(
        String(2), ForeignKey("countries.code", ondelete="SET NULL"), nullable=True
    )
    postal_code: Mapped[str | None] = mapped_column(String, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User | None"] = relationship("User", back_populates="addresses")
    organization: Mapped["Organization | None"] = relationship("Organization", back_populates="addresses")
    region: Mapped["Region | None"] = relationship("Region")
    country: Mapped["Country | None"] = relationship("Country")


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (UniqueConstraint("owner_user_id", "contact_user_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    contact_user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    nickname: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    owner: Mapped["User"] = relationship(
        "User",
        foreign_keys=[owner_user_id],
        back_populates="owned_contacts",
    )
    contact_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[contact_user_id],
        back_populates="saved_by_contacts",
    )


UserContact = Contact


class SocialPlatform(Base):
    __tablename__ = "social_platforms"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    icon_slug: Mapped[str] = mapped_column(String, nullable=False)
    profile_url_template: Mapped[str | None] = mapped_column(String, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user_profiles: Mapped[list["UserSocialProfile"]] = relationship("UserSocialProfile", back_populates="platform")


class UserSocialProfile(Base):
    __tablename__ = "user_social_profiles"
    __table_args__ = (UniqueConstraint("user_id", "platform_id", "handle"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform_id: Mapped[str] = mapped_column(
        String, ForeignKey("social_platforms.id", ondelete="CASCADE"), nullable=False
    )
    handle: Mapped[str] = mapped_column(String, nullable=False)
    profile_url: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    visibility: Mapped[str] = mapped_column(String, nullable=False, server_default="private")
    verified_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="social_profiles")
    platform: Mapped["SocialPlatform"] = relationship("SocialPlatform", back_populates="user_profiles")
