import { AppHttpError } from '@/http/errors'
import { listObject, type ListObject } from '@/http/envelope'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { defaultPermissionsForRoleName } from '@/platform/permissions'

import * as repository from './structure.repository'
import {
  serializeEmployeeProfile,
  serializeOrgContact,
  serializeOrgDepartment,
  serializeOrgLocation,
} from './structure.serializers'
import type {
  EmployeeProfile,
  EmployeeProfileCreate,
  EmployeeProfileUpdate,
  OrgContact,
  OrgContactCreate,
  OrgContactUpdate,
  OrgDepartment,
  OrgDepartmentCreate,
  OrgDepartmentUpdate,
  OrgLocation,
  OrgLocationCreate,
  OrgLocationUpdate,
} from './structure.schemas'
import type { Organization } from './organizations.schemas'
import { serializeOrganization } from './organizations.serializers'
import { findOrganizationById } from './organizations.repository'

type Principal = { internal: boolean; userId: string | null }

function notFound(code: string, message: string): AppHttpError {
  return new AppHttpError({ code, message, httpStatus: 404 })
}
function forbidden(msg = 'Forbidden.'): AppHttpError {
  return new AppHttpError({
    code: 'auth/forbidden',
    message: msg,
    httpStatus: 403,
  })
}
function noSession(): AppHttpError {
  return new AppHttpError({
    code: 'auth/no-session',
    message: 'No active session.',
    httpStatus: 401,
  })
}
async function requireOrgMembership(
  orgId: string,
  principal: Principal,
  roles?: readonly string[]
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()
  const membership = await repository.findMembershipForUser(
    orgId,
    principal.userId
  )
  if (!membership || membership.status !== 'active') throw forbidden()
  if (roles && !roles.includes(membership.role)) throw forbidden()
}
async function requireOrgPermission(
  orgId: string,
  principal: Principal,
  permission: string
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()
  const membership = await repository.findMembershipForUser(
    orgId,
    principal.userId
  )
  if (!membership || membership.status !== 'active') throw forbidden()
  const permissions = await resolveMemberPermissions(membership)
  if (!permissions.has(permission)) throw forbidden()
}
async function resolveMemberPermissions(membership: {
  roleId: string | null
  organizationId: string
  role: string
}): Promise<Set<string>> {
  if (membership.roleId) {
    const role = await repository.findRoleForMembership(
      membership.roleId,
      membership.organizationId
    )
    if (role) return new Set(role.permissions)
  }
  return new Set(defaultPermissionsForRoleName(membership.role))
}

function duplicateCode(): AppHttpError {
  return new AppHttpError({
    code: 'location/duplicate-code',
    message: 'A location with this code already exists.',
    httpStatus: 409,
  })
}

// Locations

export async function listOrgLocations(
  orgId: string,
  principal: Principal
): Promise<ListObject<OrgLocation>> {
  await requireOrgMembership(orgId, principal)
  const rows = await repository.listLocationsByOrg(orgId)
  return listObject({
    data: rows.map(serializeOrgLocation),
    hasMore: false,
    url: `/organizations/${orgId}/locations`,
  })
}

export async function createOrgLocation(
  orgId: string,
  body: OrgLocationCreate,
  principal: Principal
): Promise<OrgLocation> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  if (
    body.code &&
    (await repository.findLocationByCodeForOrg(body.code, orgId, true))
  )
    throw duplicateCode()
  if (body.is_primary) await repository.clearPrimaryForOrg(orgId)
  const now = BigInt(nowUnixSeconds())
  try {
    const row = await repository.createLocation({
      id: generateId('orgLocation'),
      organizationId: orgId,
      name: body.name,
      code: body.code ?? null,
      type: body.type ?? null,
      status: body.status ?? null,
      isPrimary: body.is_primary ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      line1: body.line1 ?? null,
      line2: body.line2 ?? null,
      city: body.city ?? null,
      regionId: body.region_id ?? null,
      countryCode: body.country_code ?? null,
      postalCode: body.postal_code ?? null,
      timezone: body.timezone ?? null,
      metadata: body.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    })
    return serializeOrgLocation(row)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique'))
      throw duplicateCode()
    throw error
  }
}

export async function retrieveOrgLocation(
  orgId: string,
  locationId: string,
  principal: Principal
): Promise<OrgLocation> {
  await requireOrgMembership(orgId, principal)
  const row = await repository.findLocationByIdForOrg(locationId, orgId)
  if (!row) throw notFound('location/not-found', 'Location not found.')
  return serializeOrgLocation(row)
}

export async function updateOrgLocation(
  orgId: string,
  locationId: string,
  body: OrgLocationUpdate,
  principal: Principal
): Promise<OrgLocation> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  const existing = await repository.findLocationByIdForOrg(locationId, orgId)
  if (!existing) throw notFound('location/not-found', 'Location not found.')
  if (body.code && body.code !== existing.code) {
    const conflict = await repository.findLocationByCodeForOrg(
      body.code,
      orgId,
      true
    )
    if (conflict) throw duplicateCode()
  }
  if (body.is_primary) await repository.clearPrimaryForOrg(orgId)
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined)
      updates[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v
  }
  // rename metadata handling already in repo
  if ('metadata' in body) updates.metadata = body.metadata ?? null
  updates.updatedAt = BigInt(nowUnixSeconds())
  const row = await repository.updateLocation(locationId, updates)
  if (!row) throw notFound('location/not-found', 'Location not found.')
  return serializeOrgLocation(row)
}

export async function deleteOrgLocation(
  orgId: string,
  locationId: string,
  principal: Principal
): Promise<{ object: 'org_location'; id: string; deleted: true }> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  const existing = await repository.findLocationByIdForOrg(locationId, orgId)
  if (!existing) throw notFound('location/not-found', 'Location not found.')
  await repository.deleteLocation(locationId, principal.userId)
  return { object: 'org_location', id: locationId, deleted: true }
}

// Contacts

async function validateContactUser(
  orgId: string,
  userId: string
): Promise<void> {
  const membership = await repository.findMembershipForUser(orgId, userId)
  if (!membership || membership.status !== 'active') {
    throw new AppHttpError({
      code: 'contact/user-not-member',
      message: 'The linked user is not an active member of this organization.',
      httpStatus: 400,
    })
  }
}

export async function listOrgContacts(
  orgId: string,
  principal: Principal
): Promise<ListObject<OrgContact>> {
  await requireOrgMembership(orgId, principal)
  const rows = await repository.listContactsByOrg(orgId)
  return listObject({
    data: rows.map(serializeOrgContact),
    hasMore: false,
    url: `/organizations/${orgId}/contacts`,
  })
}

export async function createOrgContact(
  orgId: string,
  body: OrgContactCreate,
  principal: Principal
): Promise<OrgContact> {
  await requireOrgPermission(orgId, principal, 'org:update')
  if (body.user_id) await validateContactUser(orgId, body.user_id)
  if (body.is_primary) await repository.clearPrimaryContactForOrg(orgId)
  const now = BigInt(nowUnixSeconds())
  const row = await repository.createContact({
    id: generateId('orgContact'),
    organizationId: orgId,
    userId: body.user_id ?? null,
    firstName: body.first_name,
    lastName: body.last_name ?? null,
    title: body.title ?? null,
    type: body.type ?? null,
    isPrimary: body.is_primary ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    mobile: body.mobile ?? null,
    notes: body.notes ?? null,
    metadata: body.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return serializeOrgContact(row)
}

export async function retrieveOrgContact(
  orgId: string,
  contactId: string,
  principal: Principal
): Promise<OrgContact> {
  await requireOrgMembership(orgId, principal)
  const row = await repository.findContactByIdForOrg(contactId, orgId)
  if (!row) throw notFound('contact/not-found', 'Contact not found.')
  return serializeOrgContact(row)
}

export async function updateOrgContact(
  orgId: string,
  contactId: string,
  body: OrgContactUpdate,
  principal: Principal
): Promise<OrgContact> {
  await requireOrgPermission(orgId, principal, 'org:update')
  const existing = await repository.findContactByIdForOrg(contactId, orgId)
  if (!existing) throw notFound('contact/not-found', 'Contact not found.')
  if (body.user_id) await validateContactUser(orgId, body.user_id)
  if (body.is_primary) await repository.clearPrimaryContactForOrg(orgId)
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) {
      if (k === 'first_name') updates.firstName = v
      else if (k === 'last_name') updates.lastName = v
      else if (k === 'user_id') updates.userId = v
      else if (k === 'is_primary') updates.isPrimary = v
      else updates[k] = v
    }
  }
  if ('metadata' in body) updates.metadata = body.metadata ?? null
  updates.updatedAt = BigInt(nowUnixSeconds())
  const row = await repository.updateContact(contactId, updates)
  if (!row) throw notFound('contact/not-found', 'Contact not found.')
  return serializeOrgContact(row)
}

export async function deleteOrgContact(
  orgId: string,
  contactId: string,
  principal: Principal
): Promise<{ object: 'org_contact'; id: string; deleted: true }> {
  await requireOrgPermission(orgId, principal, 'org:update')
  const existing = await repository.findContactByIdForOrg(contactId, orgId)
  if (!existing) throw notFound('contact/not-found', 'Contact not found.')
  await repository.deleteContact(contactId, principal.userId)
  return { object: 'org_contact', id: contactId, deleted: true }
}

// Departments

async function requireOrgMembershipRecord(
  orgId: string,
  membershipId: string
): Promise<void> {
  const membership = await repository.findMembershipById(membershipId)
  if (
    !membership ||
    membership.organizationId !== orgId ||
    membership.deletedAt !== null
  ) {
    throw new AppHttpError({
      code: 'membership/not-in-organization',
      message: 'Membership does not belong to this organization.',
      httpStatus: 422,
    })
  }
}

export async function listOrgDepartments(
  orgId: string,
  principal: Principal
): Promise<ListObject<OrgDepartment>> {
  await requireOrgMembership(orgId, principal)
  const rows = await repository.listDepartmentsByOrg(orgId)
  return listObject({
    data: rows.map(serializeOrgDepartment),
    hasMore: false,
    url: `/organizations/${orgId}/departments`,
  })
}

export async function createOrgDepartment(
  orgId: string,
  body: OrgDepartmentCreate,
  principal: Principal
): Promise<OrgDepartment> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  if (body.parent_department_id) {
    const parent = await repository.findDepartmentByIdForOrg(
      body.parent_department_id,
      orgId
    )
    if (!parent) {
      throw new AppHttpError({
        code: 'department/parent-not-in-organization',
        message: 'Parent department does not belong to this organization.',
        httpStatus: 422,
      })
    }
  }
  if (body.head_membership_id)
    await requireOrgMembershipRecord(orgId, body.head_membership_id)
  const now = BigInt(nowUnixSeconds())
  const row = await repository.createDepartment({
    id: generateId('department'),
    organizationId: orgId,
    name: body.name,
    code: body.code ?? null,
    description: body.description ?? null,
    parentDepartmentId: body.parent_department_id ?? null,
    headMembershipId: body.head_membership_id ?? null,
    status: body.status ?? null,
    metadata: body.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return serializeOrgDepartment(row)
}

export async function retrieveOrgDepartment(
  orgId: string,
  departmentId: string,
  principal: Principal
): Promise<OrgDepartment> {
  await requireOrgMembership(orgId, principal)
  const row = await repository.findDepartmentByIdForOrg(departmentId, orgId)
  if (!row) throw notFound('department/not-found', 'Department not found.')
  return serializeOrgDepartment(row)
}

export async function updateOrgDepartment(
  orgId: string,
  departmentId: string,
  body: OrgDepartmentUpdate,
  principal: Principal
): Promise<OrgDepartment> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  const existing = await repository.findDepartmentByIdForOrg(
    departmentId,
    orgId
  )
  if (!existing) throw notFound('department/not-found', 'Department not found.')
  if (
    body.parent_department_id !== undefined &&
    body.parent_department_id !== null
  ) {
    if (body.parent_department_id === departmentId) {
      throw new AppHttpError({
        code: 'department/invalid-parent',
        message: 'A department cannot be its own parent.',
        httpStatus: 422,
      })
    }
    const parent = await repository.findDepartmentByIdForOrg(
      body.parent_department_id,
      orgId
    )
    if (!parent) {
      throw new AppHttpError({
        code: 'department/parent-not-in-organization',
        message: 'Parent department does not belong to this organization.',
        httpStatus: 422,
      })
    }
  }
  if (
    body.head_membership_id !== undefined &&
    body.head_membership_id !== null
  ) {
    await requireOrgMembershipRecord(orgId, body.head_membership_id)
  }
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) {
      if (k === 'parent_department_id') updates.parentDepartmentId = v
      else if (k === 'head_membership_id') updates.headMembershipId = v
      else updates[k] = v
    }
  }
  if ('metadata' in body) updates.metadata = body.metadata ?? null
  updates.updatedAt = BigInt(nowUnixSeconds())
  const row = await repository.updateDepartment(departmentId, updates)
  if (!row) throw notFound('department/not-found', 'Department not found.')
  return serializeOrgDepartment(row)
}

export async function deleteOrgDepartment(
  orgId: string,
  departmentId: string,
  principal: Principal
): Promise<{ object: 'org_department'; id: string; deleted: true }> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  const existing = await repository.findDepartmentByIdForOrg(
    departmentId,
    orgId
  )
  if (!existing) throw notFound('department/not-found', 'Department not found.')
  await repository.deleteDepartment(departmentId, principal.userId)
  return { object: 'org_department', id: departmentId, deleted: true }
}

// Employees

async function validateEmployeeRefs(
  orgId: string,
  departmentId: string | null | undefined,
  locationId: string | null | undefined,
  managerMembershipId: string | null | undefined
): Promise<void> {
  if (departmentId) {
    const dept = await repository.findDepartmentByIdForOrg(departmentId, orgId)
    if (!dept) {
      throw new AppHttpError({
        code: 'department/not-in-organization',
        message: 'Department does not belong to this organization.',
        httpStatus: 422,
      })
    }
  }
  if (locationId) {
    const loc = await repository.findLocationByIdForOrg(locationId, orgId)
    if (!loc) {
      throw new AppHttpError({
        code: 'location/not-in-organization',
        message: 'Location does not belong to this organization.',
        httpStatus: 422,
      })
    }
  }
  if (managerMembershipId)
    await requireOrgMembershipRecord(orgId, managerMembershipId)
}

export async function listOrgEmployees(
  orgId: string,
  principal: Principal
): Promise<ListObject<EmployeeProfile>> {
  await requireOrgMembership(orgId, principal)
  const rows = await repository.listEmployeesByOrg(orgId)
  return listObject({
    data: rows.map(serializeEmployeeProfile),
    hasMore: false,
    url: `/organizations/${orgId}/employees`,
  })
}

export async function createOrgEmployee(
  orgId: string,
  body: EmployeeProfileCreate,
  principal: Principal
): Promise<EmployeeProfile> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  const membership = await repository.findMembershipById(body.membership_id)
  if (
    !membership ||
    membership.organizationId !== orgId ||
    membership.deletedAt !== null
  ) {
    throw new AppHttpError({
      code: 'membership/not-in-organization',
      message: 'Membership does not belong to this organization.',
      httpStatus: 422,
    })
  }
  if (await repository.findEmployeeByMembership(body.membership_id, true)) {
    throw new AppHttpError({
      code: 'employee/duplicate-membership',
      message: 'This membership already has an employee profile.',
      httpStatus: 409,
    })
  }
  await validateEmployeeRefs(
    orgId,
    body.department_id,
    body.location_id,
    body.manager_membership_id
  )
  const now = BigInt(nowUnixSeconds())
  const row = await repository.createEmployee({
    id: generateId('employeeProfile'),
    membershipId: body.membership_id,
    organizationId: orgId,
    employeeNumber: body.employee_number ?? null,
    jobTitle: body.job_title ?? null,
    departmentId: body.department_id ?? null,
    locationId: body.location_id ?? null,
    managerMembershipId: body.manager_membership_id ?? null,
    employmentType: body.employment_type ?? null,
    employmentStatus: body.employment_status ?? null,
    division: body.division ?? null,
    costCenter: body.cost_center ?? null,
    workEmail: body.work_email ?? null,
    workPhone: body.work_phone ?? null,
    startDate:
      body.start_date !== undefined && body.start_date !== null
        ? BigInt(body.start_date)
        : null,
    endDate:
      body.end_date !== undefined && body.end_date !== null
        ? BigInt(body.end_date)
        : null,
    metadata: body.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return serializeEmployeeProfile(row)
}

export async function retrieveOrgEmployee(
  orgId: string,
  profileId: string,
  principal: Principal
): Promise<EmployeeProfile> {
  await requireOrgMembership(orgId, principal)
  const row = await repository.findEmployeeByIdForOrg(profileId, orgId)
  if (!row) throw notFound('employee/not-found', 'Employee profile not found.')
  return serializeEmployeeProfile(row)
}

export async function updateOrgEmployee(
  orgId: string,
  profileId: string,
  body: EmployeeProfileUpdate,
  principal: Principal
): Promise<EmployeeProfile> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  const existing = await repository.findEmployeeByIdForOrg(profileId, orgId)
  if (!existing)
    throw notFound('employee/not-found', 'Employee profile not found.')
  await validateEmployeeRefs(
    orgId,
    body.department_id,
    body.location_id,
    body.manager_membership_id
  )
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) {
      if (k === 'employee_number') updates.employeeNumber = v
      else if (k === 'job_title') updates.jobTitle = v
      else if (k === 'department_id') updates.departmentId = v
      else if (k === 'location_id') updates.locationId = v
      else if (k === 'manager_membership_id') updates.managerMembershipId = v
      else if (k === 'employment_type') updates.employmentType = v
      else if (k === 'employment_status') updates.employmentStatus = v
      else if (k === 'cost_center') updates.costCenter = v
      else if (k === 'work_email') updates.workEmail = v
      else if (k === 'work_phone') updates.workPhone = v
      else if (k === 'start_date')
        updates.startDate = v !== null ? BigInt(v as number) : null
      else if (k === 'end_date')
        updates.endDate = v !== null ? BigInt(v as number) : null
      else updates[k] = v
    }
  }
  if ('metadata' in body) updates.metadata = body.metadata ?? null
  updates.updatedAt = BigInt(nowUnixSeconds())
  await repository.updateEmployee(profileId, updates)
  const row = await repository.findEmployeeByIdForOrg(profileId, orgId)
  if (!row) throw notFound('employee/not-found', 'Employee profile not found.')
  return serializeEmployeeProfile(row)
}

export async function deleteOrgEmployee(
  orgId: string,
  profileId: string,
  principal: Principal
): Promise<{ object: 'employee_profile'; id: string; deleted: true }> {
  await requireOrgPermission(orgId, principal, 'structure:manage')
  const existing = await repository.findEmployeeByIdForOrg(profileId, orgId)
  if (!existing)
    throw notFound('employee/not-found', 'Employee profile not found.')
  await repository.deleteEmployee(profileId, principal.userId)
  return { object: 'employee_profile', id: profileId, deleted: true }
}

// Self-scoped org details

export async function retrieveMyOrgDetails(
  orgId: string,
  principal: Principal
): Promise<Organization> {
  await requireOrgMembership(orgId, principal)
  const org = await findOrganizationById(orgId)
  if (!org) throw notFound('organization/not-found', 'Organization not found.')
  return serializeOrganization(org)
}

export async function updateMyOrgDetails(
  orgId: string,
  body: Record<string, unknown>,
  principal: Principal
): Promise<Organization> {
  await requireOrgPermission(orgId, principal, 'org:update')
  const org = await findOrganizationById(orgId)
  if (!org) throw notFound('organization/not-found', 'Organization not found.')
  const updates: Record<string, unknown> = { ...body }
  if ('country_code' in updates && typeof updates.country_code === 'string') {
    updates.countryCode = (updates.country_code as string).toUpperCase()
    delete updates.country_code
  }
  if ('currency_code' in updates && typeof updates.currency_code === 'string') {
    updates.currencyCode = (updates.currency_code as string).toUpperCase()
    delete updates.currency_code
  }
  // map snake to camel for remaining fields
  const mapped: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(updates)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    mapped[camel] = v
  }
  mapped.updatedAt = BigInt(nowUnixSeconds())
  const updated = await repository.updateOrganizationDetails(
    orgId,
    mapped as never
  )
  return serializeOrganization(updated as unknown as never)
}
