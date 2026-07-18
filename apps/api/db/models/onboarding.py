from typing import Literal

from sqlalchemy import JSON, BigInteger, CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base


class OnboardingSession(Base):
    """One durable response set for an organization and onboarding target."""

    __tablename__ = "onboarding_sessions"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "target_type",
            "target_key",
            "country_code",
            "schema_version",
            "catalog_revision",
        ),
        CheckConstraint(
            "target_type IN ('organization', 'application')",
            name="onboarding_sessions_target_type_check",
        ),
        CheckConstraint(
            "status IN ('draft', 'submitted', 'completed', 'needs_update')",
            name="onboarding_sessions_status_check",
        ),
        CheckConstraint("schema_version = 1", name="onboarding_sessions_schema_version_check"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type: Mapped[Literal["organization", "application"]] = mapped_column(String, nullable=False)
    target_key: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    schema_version: Mapped[int] = mapped_column(nullable=False, server_default="1")
    catalog_revision: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[Literal["draft", "submitted", "completed", "needs_update"]] = mapped_column(
        String,
        nullable=False,
        server_default="draft",
    )
    submitted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    completed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    answers: Mapped[list["OnboardingAnswer"]] = relationship(
        "OnboardingAnswer",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class OnboardingAnswer(Base):
    """A catalog-keyed onboarding answer; values remain schema-driven JSON."""

    __tablename__ = "onboarding_answers"
    __table_args__ = (UniqueConstraint("session_id", "field_key"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("onboarding_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_key: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[object] = mapped_column(JSON, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    session: Mapped[OnboardingSession] = relationship(OnboardingSession, back_populates="answers")
