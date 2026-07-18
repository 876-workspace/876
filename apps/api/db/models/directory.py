"""Jamaica directory domain: geo-tagged reference data for national institutions.

Financial institutions (banks, branches, credit unions, bank accounts),
government infrastructure (ministries, departments/agencies), and the
education directory (universities, campuses, secondary schools). Explicit
per-entity tables (no generic institution EAV) so every locatable record is
guaranteed a ``DirectoryAddress`` with required WGS 84 coordinates.

See ``docs/jamaica-directory-database.md`` for the architecture decision.
"""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base


class DirectoryAddress(Base):
    """A physical address with mandatory WGS 84 coordinates (EPSG:4326).

    Directory-owned: distinct from the user/org ``addresses`` table, whose
    fields are optional. Every directory location FKs here, so coordinates
    are guaranteed for any mapping service (Google Maps, Apple Maps, Mapbox).
    """

    __tablename__ = "directory_addresses"
    __table_args__ = (Index("ix_directory_addresses_state_city", "state", "city"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    # Stripe-compliant standard fields
    line1: Mapped[str] = mapped_column(String, nullable=False)
    line2: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)  # Parish for JM (e.g. "St. Andrew")
    postal_code: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g. "Kingston 10"
    country: Mapped[str] = mapped_column(String(2), nullable=False, server_default="JM")  # ISO 3166-1 alpha-2
    # Coordinates are required — latitude ∈ [-90, 90], longitude ∈ [-180, 180]
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    bank_branches: Mapped[list["BankBranch"]] = relationship("BankBranch", back_populates="address")
    credit_union_branches: Mapped[list["CreditUnionBranch"]] = relationship(
        "CreditUnionBranch", back_populates="address"
    )
    ministry_departments: Mapped[list["MinistryDepartment"]] = relationship(
        "MinistryDepartment", back_populates="address"
    )
    university_campuses: Mapped[list["UniversityCampus"]] = relationship(
        "UniversityCampus", back_populates="address"
    )
    secondary_schools: Mapped[list["SecondarySchool"]] = relationship(
        "SecondarySchool", back_populates="address"
    )


class Bank(Base):
    __tablename__ = "banks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "National Commercial Bank Jamaica"
    short_name: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g. "NCB"
    bank_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # BOJ ACH bank code
    swift_code: Mapped[str | None] = mapped_column(String, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    head_office: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    branches: Mapped[list["BankBranch"]] = relationship("BankBranch", back_populates="bank")
    accounts: Mapped[list["BankAccount"]] = relationship("BankAccount", back_populates="bank")


class BankBranch(Base):
    __tablename__ = "bank_branches"
    # A bank cannot have two branches with the same transit number
    __table_args__ = (UniqueConstraint("bank_id", "transit_number"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    bank_id: Mapped[str] = mapped_column(
        String, ForeignKey("banks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Half Way Tree"
    transit_number: Mapped[str] = mapped_column(String, nullable=False)  # 5-digit branch code
    routing_number: Mapped[str | None] = mapped_column(String, nullable=True)  # 9-digit ACH composite
    address_id: Mapped[str] = mapped_column(
        String, ForeignKey("directory_addresses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    contact_number: Mapped[str | None] = mapped_column(String, nullable=True)
    operating_hours: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    bank: Mapped["Bank"] = relationship("Bank", back_populates="branches")
    address: Mapped["DirectoryAddress"] = relationship("DirectoryAddress", back_populates="bank_branches")
    accounts: Mapped[list["BankAccount"]] = relationship("BankAccount", back_populates="branch")


class CreditUnion(Base):
    __tablename__ = "credit_unions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "EduCom Co-operative Credit Union"
    short_name: Mapped[str | None] = mapped_column(String, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    headquarters: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    branches: Mapped[list["CreditUnionBranch"]] = relationship("CreditUnionBranch", back_populates="credit_union")


class CreditUnionBranch(Base):
    __tablename__ = "credit_union_branches"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    credit_union_id: Mapped[str] = mapped_column(
        String, ForeignKey("credit_unions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    address_id: Mapped[str] = mapped_column(
        String, ForeignKey("directory_addresses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    contact_number: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    credit_union: Mapped["CreditUnion"] = relationship("CreditUnion", back_populates="branches")
    address: Mapped["DirectoryAddress"] = relationship(
        "DirectoryAddress", back_populates="credit_union_branches"
    )


class BankAccount(Base):
    """A bank account record: bank required, branch optional (not every bank

    ties accounts to a branch). ``account_number`` is a string to preserve
    leading zeros. ``account_type`` is ``savings`` or ``checking``;
    ``currency`` is an ISO 4217 code (JMD, USD, CAD, GBP, EUR).
    """

    __tablename__ = "bank_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_holder: Mapped[str] = mapped_column(String, nullable=False)
    bank_id: Mapped[str] = mapped_column(
        String, ForeignKey("banks.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    branch_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("bank_branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    account_number: Mapped[str] = mapped_column(String, nullable=False)
    account_type: Mapped[str] = mapped_column(String, nullable=False, server_default="savings")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="JMD")
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    bank: Mapped["Bank"] = relationship("Bank", back_populates="accounts")
    branch: Mapped["BankBranch | None"] = relationship("BankBranch", back_populates="accounts")


class Ministry(Base):
    __tablename__ = "ministries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Ministry of Finance and the Public Service"
    portfolio: Mapped[str | None] = mapped_column(String, nullable=True)
    minister: Mapped[str | None] = mapped_column(String, nullable=True)  # Current appointed minister
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    departments: Mapped[list["MinistryDepartment"]] = relationship(
        "MinistryDepartment", back_populates="ministry"
    )


class MinistryDepartment(Base):
    __tablename__ = "ministry_departments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ministry_id: Mapped[str] = mapped_column(
        String, ForeignKey("ministries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Tax Administration Jamaica"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address_id: Mapped[str] = mapped_column(
        String, ForeignKey("directory_addresses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    contact_email: Mapped[str | None] = mapped_column(String, nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    ministry: Mapped["Ministry"] = relationship("Ministry", back_populates="departments")
    address: Mapped["DirectoryAddress"] = relationship(
        "DirectoryAddress", back_populates="ministry_departments"
    )


class University(Base):
    __tablename__ = "universities"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "University of the West Indies"
    acronym: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g. "UWI", "UTech"
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    campuses: Mapped[list["UniversityCampus"]] = relationship("UniversityCampus", back_populates="university")


class UniversityCampus(Base):
    __tablename__ = "university_campuses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    university_id: Mapped[str] = mapped_column(
        String, ForeignKey("universities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Mona Campus"
    is_main_campus: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    address_id: Mapped[str] = mapped_column(
        String, ForeignKey("directory_addresses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    contact_number: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    university: Mapped["University"] = relationship("University", back_populates="campuses")
    address: Mapped["DirectoryAddress"] = relationship(
        "DirectoryAddress", back_populates="university_campuses"
    )


class SecondarySchool(Base):
    __tablename__ = "secondary_schools"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Kingston College"
    principal: Mapped[str | None] = mapped_column(String, nullable=True)
    school_type: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g. "Traditional High"
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    address_id: Mapped[str] = mapped_column(
        String, ForeignKey("directory_addresses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    contact_number: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    address: Mapped["DirectoryAddress"] = relationship(
        "DirectoryAddress", back_populates="secondary_schools"
    )
