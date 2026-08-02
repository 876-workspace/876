"""Persisted, privacy-minimised communications records."""

from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class CommunicationPhoneLookup(Base):
    __tablename__ = "communication_phone_lookups"

    number: Mapped[str] = mapped_column(String, primary_key=True)
    valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    e164: Mapped[str | None] = mapped_column(String, nullable=True)
    national_format: Mapped[str | None] = mapped_column(String, nullable=True)
    country_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    carrier_name: Mapped[str | None] = mapped_column(String, nullable=True)
    line_type: Mapped[str | None] = mapped_column(String, nullable=True)
    mobile_country_code: Mapped[str | None] = mapped_column(String, nullable=True)
    mobile_network_code: Mapped[str | None] = mapped_column(String, nullable=True)
    line_type_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class CommunicationMessage(Base):
    __tablename__ = "communication_messages"
    __table_args__ = (
        UniqueConstraint("idempotency_scope", "idempotency_key", name="uq_communication_messages_idempotency"),
        Index("ix_communication_messages_provider_sid", "provider_sid"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_sid: Mapped[str | None] = mapped_column(String, nullable=True)
    channel: Mapped[str] = mapped_column(String, nullable=False)
    direction: Mapped[str] = mapped_column(String, nullable=False, server_default="outbound")
    status: Mapped[str] = mapped_column(String, nullable=False)
    to_number: Mapped[str] = mapped_column(String, nullable=False)
    from_number: Mapped[str | None] = mapped_column(String, nullable=True)
    messaging_service_sid: Mapped[str | None] = mapped_column(String, nullable=True)
    content_sid: Mapped[str | None] = mapped_column(String, nullable=True)
    body_preview: Mapped[str | None] = mapped_column(String(160), nullable=True)
    body_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    organization_id: Mapped[str | None] = mapped_column(String, nullable=True)
    app_id: Mapped[str | None] = mapped_column(String, nullable=True)
    client_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    idempotency_scope: Mapped[str] = mapped_column(String, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    provider_error_code: Mapped[str | None] = mapped_column(String, nullable=True)
    sent_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    delivered_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    read_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    failed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class CommunicationWebhookEvent(Base):
    __tablename__ = "communication_webhook_events"
    __table_args__ = (
        UniqueConstraint("provider_sid", "event_type", "payload_hash", name="uq_communication_webhook_event"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    provider_sid: Mapped[str] = mapped_column(String, nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    processed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
