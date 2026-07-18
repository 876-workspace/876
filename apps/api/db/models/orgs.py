from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    ARRAY,
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
    from db.models.apps import App
    from db.models.contacts import Address
    from db.models.features import OrgFeature
    from db.models.geo import Country, Currency, Region
    from db.models.subscriptions import Subscription
    from db.models.users import User


class OrganizationRole(Base):
    __tablename__ = "organization_roles"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    permissions: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default="{}")
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="roles")
    memberships: Mapped[list["Membership"]] = relationship("Membership", back_populates="organization_role")


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workos_organization_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    short_name: Mapped[str | None] = mapped_column(String, nullable=True)
    doing_business_as: Mapped[str | None] = mapped_column(String, nullable=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # Business identity
    industry: Mapped[str | None] = mapped_column(String, nullable=True)
    business_type: Mapped[str | None] = mapped_column(String, nullable=True)
    # Registry identifiers (Companies Office of Jamaica BRF-1 set; extend per-country later)
    registration_number: Mapped[str | None] = mapped_column(String, nullable=True)
    trn: Mapped[str | None] = mapped_column(String, nullable=True)
    nis_number: Mapped[str | None] = mapped_column(String, nullable=True)
    gct_number: Mapped[str | None] = mapped_column(String, nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String, nullable=True)
    incorporation_date: Mapped[str | None] = mapped_column(String, nullable=True)
    # Contact details
    primary_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    primary_email: Mapped[str | None] = mapped_column(String, nullable=True)
    fax: Mapped[str | None] = mapped_column(String, nullable=True)
    website_url: Mapped[str | None] = mapped_column(String, nullable=True)
    support_url: Mapped[str | None] = mapped_column(String, nullable=True)
    primary_contact_user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Locale
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str | None] = mapped_column(String, nullable=True)
    # Address
    address_line1: Mapped[str | None] = mapped_column(String, nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    region_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("regions.id", ondelete="SET NULL"), nullable=True
    )
    country_code: Mapped[str | None] = mapped_column(
        String(2), ForeignKey("countries.code", ondelete="SET NULL"), nullable=True
    )
    # Financial
    currency_code: Mapped[str | None] = mapped_column(
        String(3), ForeignKey("currencies.code", ondelete="SET NULL"), nullable=True, server_default="JMD"
    )
    # Legacy - stripe_customer_id removed
    # Enrollment
    enrollment_completed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    memberships: Mapped[list["Membership"]] = relationship("Membership", back_populates="organization")
    roles: Mapped[list["OrganizationRole"]] = relationship("OrganizationRole", back_populates="organization")
    features: Mapped[list["OrgFeature"]] = relationship("OrgFeature", back_populates="organization")
    subscriptions: Mapped[list["Subscription"]] = relationship("Subscription", back_populates="organization")
    apps: Mapped[list["App"]] = relationship("App", back_populates="organization")
    addresses: Mapped[list["Address"]] = relationship("Address", back_populates="organization")
    locations: Mapped[list["OrgLocation"]] = relationship("OrgLocation", back_populates="organization")
    org_contacts: Mapped[list["OrgContact"]] = relationship("OrgContact", back_populates="organization")
    departments: Mapped[list["OrgDepartment"]] = relationship("OrgDepartment", back_populates="organization")
    employee_profiles: Mapped[list["EmployeeProfile"]] = relationship(
        "EmployeeProfile", back_populates="organization"
    )
    region: Mapped["Region | None"] = relationship("Region")
    country: Mapped["Country | None"] = relationship("Country")
    currency: Mapped["Currency | None"] = relationship("Currency")


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workos_membership_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    role_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organization_roles.id", ondelete="SET NULL"), nullable=True
    )
    role: Mapped[str] = mapped_column(String, nullable=False, server_default="member")
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="memberships")
    organization_role: Mapped["OrganizationRole | None"] = relationship(
        "OrganizationRole",
        back_populates="memberships",
    )
    employee_profile: Mapped["EmployeeProfile | None"] = relationship(
        "EmployeeProfile",
        foreign_keys="EmployeeProfile.membership_id",
        back_populates="membership",
        uselist=False,
    )


class OrgLocation(Base):
    """A physical or logical site belonging to an organization (HQ, branch, office, warehouse)."""

    __tablename__ = "org_locations"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False, server_default="office")
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
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
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="locations")
    region: Mapped["Region | None"] = relationship("Region")
    country: Mapped["Country | None"] = relationship("Country")


class OrgContact(Base):
    """A contact person for an organization (billing, technical, legal, general)."""

    __tablename__ = "org_contacts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    # Set when the contact is a platform member of this org; null for
    # external (non-member) contacts.
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False, server_default="general")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    mobile: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="org_contacts")


class OrgDepartment(Base):
    """An organizational unit; supports nesting via parent_department_id."""

    __tablename__ = "org_departments"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_department_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("org_departments.id", ondelete="SET NULL"), nullable=True
    )
    head_membership_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("memberships.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="departments")
    parent: Mapped["OrgDepartment | None"] = relationship(
        "OrgDepartment", remote_side="OrgDepartment.id", back_populates="children"
    )
    children: Mapped[list["OrgDepartment"]] = relationship("OrgDepartment", back_populates="parent")
    head: Mapped["Membership | None"] = relationship("Membership", foreign_keys=[head_membership_id])
    employees: Mapped[list["EmployeeProfile"]] = relationship(
        "EmployeeProfile", back_populates="department"
    )


class EmployeeProfile(Base):
    """Employment record for an org member (1:1 with membership).

    Field set follows the SCIM Enterprise User extension (employee_number,
    division, cost_center, manager) plus common HRIS directory fields.
    """

    __tablename__ = "employee_profiles"
    __table_args__ = (UniqueConstraint("organization_id", "employee_number"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    membership_id: Mapped[str] = mapped_column(
        String, ForeignKey("memberships.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    employee_number: Mapped[str | None] = mapped_column(String, nullable=True)
    job_title: Mapped[str | None] = mapped_column(String, nullable=True)
    department_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("org_departments.id", ondelete="SET NULL"), nullable=True
    )
    location_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("org_locations.id", ondelete="SET NULL"), nullable=True
    )
    manager_membership_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("memberships.id", ondelete="SET NULL"), nullable=True
    )
    employment_type: Mapped[str | None] = mapped_column(String, nullable=True)
    employment_status: Mapped[str] = mapped_column(String, nullable=False, server_default="active")
    division: Mapped[str | None] = mapped_column(String, nullable=True)
    cost_center: Mapped[str | None] = mapped_column(String, nullable=True)
    work_email: Mapped[str | None] = mapped_column(String, nullable=True)
    work_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    start_date: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    end_date: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    membership: Mapped["Membership"] = relationship(
        "Membership", foreign_keys=[membership_id], back_populates="employee_profile"
    )
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="employee_profiles"
    )
    department: Mapped["OrgDepartment | None"] = relationship(
        "OrgDepartment", back_populates="employees"
    )
    location: Mapped["OrgLocation | None"] = relationship("OrgLocation")
    manager_membership: Mapped["Membership | None"] = relationship(
        "Membership", foreign_keys=[manager_membership_id]
    )
