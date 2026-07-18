from decimal import Decimal
from typing import Literal

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base


class ProvisioningManifest(Base):
    """Stable identity for one organization, finance, or application recipe."""

    __tablename__ = "provisioning_manifests"
    __table_args__ = (
        UniqueConstraint("target_type", "target_key"),
        CheckConstraint(
            "target_type IN ('organization', 'finance', 'application')",
            name="provisioning_manifests_target_type_check",
        ),
        CheckConstraint(
            "manifest_version = 1",
            name="provisioning_manifests_version_check",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    target_type: Mapped[Literal["organization", "finance", "application"]] = mapped_column(
        String, nullable=False, index=True
    )
    target_key: Mapped[str] = mapped_column(String, nullable=False)
    manifest_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    revisions: Mapped[list["ProvisioningManifestRevision"]] = relationship(
        "ProvisioningManifestRevision",
        back_populates="manifest",
        cascade="all, delete-orphan",
    )
    notes: Mapped[list["ProvisioningNote"]] = relationship(
        "ProvisioningNote",
        back_populates="manifest",
        cascade="all, delete-orphan",
    )


class ProvisioningManifestRevision(Base):
    """Immutable once published; draft content may be replaced before publish."""

    __tablename__ = "provisioning_manifest_revisions"
    __table_args__ = (
        UniqueConstraint("manifest_id", "revision"),
        CheckConstraint("revision >= 1", name="provisioning_manifest_revisions_revision_check"),
        CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name="provisioning_manifest_revisions_status_check",
        ),
        CheckConstraint(
            "reconciliation = 'create_missing'",
            name="provisioning_manifest_revisions_reconciliation_check",
        ),
        CheckConstraint(
            "preserve_tenant_overrides",
            name="provisioning_manifest_revisions_preserve_overrides_check",
        ),
        CheckConstraint(
            "finance_dependency IN ('none', 'embedded')",
            name="provisioning_manifest_revisions_finance_dependency_check",
        ),
        CheckConstraint(
            "(finance_dependency = 'none' AND cardinality(finance_scopes) = 0) "
            "OR (finance_dependency = 'embedded' AND cardinality(finance_scopes) > 0)",
            name="provisioning_manifest_revisions_finance_scopes_check",
        ),
        Index(
            "uq_provisioning_manifest_revisions_draft",
            "manifest_id",
            unique=True,
            postgresql_where=sa_text("status = 'draft'"),
        ),
        Index(
            "uq_provisioning_manifest_revisions_published",
            "manifest_id",
            unique=True,
            postgresql_where=sa_text("status = 'published'"),
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    manifest_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("provisioning_manifests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[Literal["draft", "published", "archived"]] = mapped_column(String, nullable=False)
    reconciliation: Mapped[Literal["create_missing"]] = mapped_column(
        String, nullable=False, server_default="create_missing"
    )
    preserve_tenant_overrides: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    finance_dependency: Mapped[Literal["none", "embedded"]] = mapped_column(
        String, nullable=False, server_default="none"
    )
    finance_scopes: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default="{}")
    published_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    manifest: Mapped["ProvisioningManifest"] = relationship("ProvisioningManifest", back_populates="revisions")
    resources: Mapped[list["ProvisioningResource"]] = relationship(
        "ProvisioningResource",
        back_populates="revision",
        cascade="all, delete-orphan",
    )
    steps: Mapped[list["ProvisioningStep"]] = relationship(
        "ProvisioningStep",
        back_populates="revision",
        cascade="all, delete-orphan",
    )


class ProvisioningResource(Base):
    __tablename__ = "provisioning_resources"
    __table_args__ = (
        UniqueConstraint("revision_id", "resource_type", "key"),
        UniqueConstraint("revision_id", "position"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    revision_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("provisioning_manifest_revisions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(String, nullable=False)
    key: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    revision: Mapped["ProvisioningManifestRevision"] = relationship(
        "ProvisioningManifestRevision", back_populates="resources"
    )
    properties: Mapped[list["ProvisioningProperty"]] = relationship(
        "ProvisioningProperty",
        back_populates="resource",
        cascade="all, delete-orphan",
    )


class ProvisioningProperty(Base):
    __tablename__ = "provisioning_properties"
    __table_args__ = (
        UniqueConstraint("resource_id", "key"),
        CheckConstraint(
            "value_type IN ('string', 'integer', 'decimal', 'boolean', 'reference')",
            name="provisioning_properties_value_type_check",
        ),
        CheckConstraint(
            "(value_type = 'string' AND string_value IS NOT NULL "
            "AND integer_value IS NULL AND decimal_value IS NULL "
            "AND boolean_value IS NULL AND reference_namespace IS NULL AND reference_key IS NULL) OR "
            "(value_type = 'integer' AND string_value IS NULL "
            "AND integer_value IS NOT NULL AND decimal_value IS NULL "
            "AND boolean_value IS NULL AND reference_namespace IS NULL AND reference_key IS NULL) OR "
            "(value_type = 'decimal' AND string_value IS NULL "
            "AND integer_value IS NULL AND decimal_value IS NOT NULL "
            "AND boolean_value IS NULL AND reference_namespace IS NULL AND reference_key IS NULL) OR "
            "(value_type = 'boolean' AND string_value IS NULL "
            "AND integer_value IS NULL AND decimal_value IS NULL "
            "AND boolean_value IS NOT NULL AND reference_namespace IS NULL AND reference_key IS NULL) OR "
            "(value_type = 'reference' AND string_value IS NULL "
            "AND integer_value IS NULL AND decimal_value IS NULL "
            "AND boolean_value IS NULL AND reference_namespace IS NOT NULL AND reference_key IS NOT NULL)",
            name="provisioning_properties_typed_value_check",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    resource_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("provisioning_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String, nullable=False)
    value_type: Mapped[Literal["string", "integer", "decimal", "boolean", "reference"]] = mapped_column(
        String, nullable=False
    )
    string_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    integer_value: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    decimal_value: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    boolean_value: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reference_namespace: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_key: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    resource: Mapped["ProvisioningResource"] = relationship("ProvisioningResource", back_populates="properties")


class ProvisioningStep(Base):
    __tablename__ = "provisioning_steps"
    __table_args__ = (
        UniqueConstraint("revision_id", "key"),
        UniqueConstraint("revision_id", "position"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    revision_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("provisioning_manifest_revisions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    revision: Mapped["ProvisioningManifestRevision"] = relationship(
        "ProvisioningManifestRevision", back_populates="steps"
    )


class ProvisioningNote(Base):
    __tablename__ = "provisioning_notes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    manifest_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("provisioning_manifests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    manifest: Mapped["ProvisioningManifest"] = relationship("ProvisioningManifest", back_populates="notes")


class ProvisioningRun(Base):
    """Durable execution history for one organization/app provisioning pass."""

    __tablename__ = "provisioning_runs"
    __table_args__ = (
        CheckConstraint(
            "trigger IN ('app_activation', 'manifest_publish', 'manual_reconcile', 'retry')",
            name="provisioning_runs_trigger_check",
        ),
        CheckConstraint(
            "status IN ('queued', 'processing', 'succeeded', 'failed')",
            name="provisioning_runs_status_check",
        ),
        CheckConstraint("manifest_version = 1", name="provisioning_runs_version_check"),
        Index("ix_provisioning_runs_org_created", "organization_id", "created_at"),
        Index("ix_provisioning_runs_delivery", "status", "available_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    app_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    subscription_id: Mapped[str | None] = mapped_column(String, nullable=True)
    outbox_event_id: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    trigger: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    manifest_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    finance_revision_id: Mapped[str | None] = mapped_column(String, nullable=True)
    finance_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    application_revision_id: Mapped[str | None] = mapped_column(String, nullable=True)
    application_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    available_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    started_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    completed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    steps: Mapped[list["ProvisioningRunStep"]] = relationship(
        "ProvisioningRunStep",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="ProvisioningRunStep.position.asc()",
    )


class ProvisioningRunStep(Base):
    __tablename__ = "provisioning_run_steps"
    __table_args__ = (
        UniqueConstraint("run_id", "target_type", "target_key", "step_key"),
        UniqueConstraint("run_id", "position"),
        CheckConstraint(
            "target_type IN ('organization', 'finance', 'application')",
            name="provisioning_run_steps_target_type_check",
        ),
        CheckConstraint(
            "status IN ('queued', 'processing', 'succeeded', 'failed')",
            name="provisioning_run_steps_status_check",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("provisioning_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type: Mapped[str] = mapped_column(String, nullable=False)
    target_key: Mapped[str] = mapped_column(String, nullable=False)
    revision_id: Mapped[str] = mapped_column(String, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    step_key: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    started_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    completed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    run: Mapped["ProvisioningRun"] = relationship("ProvisioningRun", back_populates="steps")
