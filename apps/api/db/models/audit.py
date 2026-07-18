from typing import Any

from sqlalchemy import JSON, BigInteger, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_created_at", "created_at"),
        Index("ix_audit_events_app_name_created_at", "app_name", "created_at"),
        Index("ix_audit_events_event_created_at", "event", "created_at"),
        Index("ix_audit_events_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    event: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False, server_default="client")
    app_name: Mapped[str] = mapped_column(String, nullable=False)
    app_id: Mapped[str | None] = mapped_column(String, ForeignKey("apps.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    search: Mapped[str | None] = mapped_column(String, nullable=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String, nullable=True)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    distinct_id: Mapped[str | None] = mapped_column(String, nullable=True)
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, server_default="{}")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
