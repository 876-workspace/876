from sqlalchemy import BigInteger, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from db.models.base import Base


class AuditEvent(Base):
    # Prefixed because Storage shares a database server with the core identity
    # API in development, and core already owns an `audit_events` table with an
    # entirely different shape. An unprefixed name silently resolves to theirs.
    __tablename__ = "storage_audit_events"
    __table_args__ = (
        Index("ix_storage_audit_events_action_created_at", "action", "created_at"),
        Index("ix_storage_audit_events_created_at", "created_at"),
        Index("ix_storage_audit_events_file_id_created_at", "file_id", "created_at"),
        Index("ix_storage_audit_events_owner_id_created_at", "owner_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    actor_id: Mapped[str | None] = mapped_column(String(255))
    source_app_id: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_type: Mapped[str] = mapped_column(String(32), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    file_id: Mapped[str] = mapped_column(String(255), nullable=False)
    upload_session_id: Mapped[str | None] = mapped_column(String(255))
    request_id: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
