import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type {
  EmployeeProfile,
  OrgContact,
  OrgDepartment,
  OrgLocation,
} from './structure.schemas'

export type OrgLocationRow = {
  id: string
  organizationId: string
  name: string
  code: string | null
  type: string
  status: string
  isPrimary: boolean
  phone: string | null
  email: string | null
  line1: string | null
  line2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  postalCode: string | null
  timezone: string | null
  metadata: unknown | null
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type OrgContactRow = {
  id: string
  organizationId: string
  userId: string | null
  firstName: string
  lastName: string | null
  title: string | null
  type: string
  isPrimary: boolean
  email: string | null
  phone: string | null
  mobile: string | null
  notes: string | null
  metadata: unknown | null
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type OrgDepartmentRow = {
  id: string
  organizationId: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
  headMembershipId: string | null
  status: string
  metadata: unknown | null
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type EmployeeProfileRow = {
  id: string
  membershipId: string
  organizationId: string
  employeeNumber: string | null
  jobTitle: string | null
  departmentId: string | null
  locationId: string | null
  managerMembershipId: string | null
  employmentType: string | null
  employmentStatus: string
  division: string | null
  costCenter: string | null
  workEmail: string | null
  workPhone: string | null
  startDate: bigint | null
  endDate: bigint | null
  metadata: unknown | null
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
  membership?: { userId: string } | null
}

export function serializeOrgLocation(row: OrgLocationRow): OrgLocation {
  return {
    object: 'org_location',
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    code: row.code,
    type: row.type,
    status: row.status,
    is_primary: row.isPrimary,
    phone: row.phone,
    email: row.email,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    region_id: row.regionId,
    country_code: row.countryCode,
    postal_code: row.postalCode,
    timezone: row.timezone,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
    deleted_by: row.deletedBy,
    deletion_reason: row.deletionReason,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeOrgContact(row: OrgContactRow): OrgContact {
  return {
    object: 'org_contact',
    id: row.id,
    organization_id: row.organizationId,
    user_id: row.userId,
    first_name: row.firstName,
    last_name: row.lastName,
    title: row.title,
    type: row.type,
    is_primary: row.isPrimary,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    notes: row.notes,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
    deleted_by: row.deletedBy,
    deletion_reason: row.deletionReason,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeOrgDepartment(row: OrgDepartmentRow): OrgDepartment {
  return {
    object: 'org_department',
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    code: row.code,
    description: row.description,
    parent_department_id: row.parentDepartmentId,
    head_membership_id: row.headMembershipId,
    status: row.status,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
    deleted_by: row.deletedBy,
    deletion_reason: row.deletionReason,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeEmployeeProfile(
  row: EmployeeProfileRow
): EmployeeProfile {
  return {
    object: 'employee_profile',
    id: row.id,
    membership_id: row.membershipId,
    organization_id: row.organizationId,
    user_id: row.membership?.userId ?? null,
    employee_number: row.employeeNumber,
    job_title: row.jobTitle,
    department_id: row.departmentId,
    location_id: row.locationId,
    manager_membership_id: row.managerMembershipId,
    employment_type: row.employmentType,
    employment_status: row.employmentStatus,
    division: row.division,
    cost_center: row.costCenter,
    work_email: row.workEmail,
    work_phone: row.workPhone,
    start_date: nullableFromDbUnixSeconds(row.startDate),
    end_date: nullableFromDbUnixSeconds(row.endDate),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
    deleted_by: row.deletedBy,
    deletion_reason: row.deletionReason,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
