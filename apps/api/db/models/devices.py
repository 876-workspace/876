from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, BigInteger, Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base

if TYPE_CHECKING:
    from db.models.users import User


class UserDevice(Base):
    __tablename__ = "user_devices"
    __table_args__ = (
        UniqueConstraint("user_id", "fingerprint"),
        Index("ix_user_devices_user_last_seen", "user_id", "last_seen_at"),
        Index("ix_user_devices_fingerprint", "fingerprint"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[str] = mapped_column(String, nullable=False, server_default="low")
    device_type: Mapped[str] = mapped_column(String, nullable=False, server_default="other")
    device_brand: Mapped[str | None] = mapped_column(String, nullable=True)
    device_model: Mapped[str | None] = mapped_column(String, nullable=True)
    os_name: Mapped[str | None] = mapped_column(String, nullable=True)
    os_version: Mapped[str | None] = mapped_column(String, nullable=True)
    browser_name: Mapped[str | None] = mapped_column(String, nullable=True)
    browser_version: Mapped[str | None] = mapped_column(String, nullable=True)
    is_bot: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    trusted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    trusted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    trusted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    blocked_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    blocked_by: Mapped[str | None] = mapped_column(String, nullable=True)
    block_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_seen_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    last_seen_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    last_ip: Mapped[str | None] = mapped_column(String, nullable=True)
    last_country_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    sign_in_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    signal: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user: Mapped[User] = relationship("User")


class AuthAttempt(Base):
    __tablename__ = "auth_attempts"
    __table_args__ = (
        Index("ix_auth_attempts_user_created", "user_id", "created_at"),
        Index("ix_auth_attempts_ip_created", "ip_address", "created_at"),
        Index("ix_auth_attempts_identifier_created", "identifier", "created_at"),
        Index("ix_auth_attempts_outcome_created", "outcome", "created_at"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    event: Mapped[str] = mapped_column(String, nullable=False)
    outcome: Mapped[str] = mapped_column(String, nullable=False)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    identifier: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    app_id: Mapped[str | None] = mapped_column(String, ForeignKey("apps.id", ondelete="SET NULL"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    realm: Mapped[str | None] = mapped_column(String, nullable=True)
    device_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("user_devices.id", ondelete="SET NULL"), nullable=True
    )
    device_fingerprint: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    ip_country_code: Mapped[str | None] = mapped_column(String(2), nullable=True, index=True)
    ip_region_code: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_region: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_city: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_postal_code: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_latitude: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_longitude: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_asn: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_as_organization: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_type: Mapped[str | None] = mapped_column(String, nullable=True)
    device_brand: Mapped[str | None] = mapped_column(String, nullable=True)
    device_model: Mapped[str | None] = mapped_column(String, nullable=True)
    os_name: Mapped[str | None] = mapped_column(String, nullable=True)
    os_version: Mapped[str | None] = mapped_column(String, nullable=True)
    browser_name: Mapped[str | None] = mapped_column(String, nullable=True)
    browser_version: Mapped[str | None] = mapped_column(String, nullable=True)
    is_bot: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    context_trusted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_reasons: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
