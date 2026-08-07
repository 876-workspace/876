import { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type {
  EmployeeProfileRow,
  OrgContactRow,
  OrgDepartmentRow,
  OrgLocationRow,
} from './structure.serializers'

// Locations

export async function listLocationsByOrg(
  organizationId: string
): Promise<OrgLocationRow[]> {
  const rows = await prisma.orgLocation.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
  return rows as unknown as OrgLocationRow[]
}

export async function findLocationByIdForOrg(
  locationId: string,
  organizationId: string
): Promise<OrgLocationRow | null> {
  const row = await prisma.orgLocation.findFirst({
    where: { id: locationId, organizationId, deletedAt: null },
  })
  return row as unknown as OrgLocationRow | null
}

export async function findLocationByCodeForOrg(
  code: string,
  organizationId: string,
  includeDeleted = false
): Promise<OrgLocationRow | null> {
  const row = await prisma.orgLocation.findFirst({
    where: {
      code,
      organizationId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
  })
  return row as unknown as OrgLocationRow | null
}

export async function clearPrimaryForOrg(
  organizationId: string
): Promise<void> {
  await prisma.orgLocation.updateMany({
    where: { organizationId, isPrimary: true },
    data: { isPrimary: false },
  })
}

export async function createLocation(data: {
  id: string
  organizationId: string
  name: string
  code?: string | null
  type?: string | null
  status?: string | null
  isPrimary?: boolean | null
  phone?: string | null
  email?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  regionId?: string | null
  countryCode?: string | null
  postalCode?: string | null
  timezone?: string | null
  metadata?: unknown | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrgLocationRow> {
  const row = await prisma.orgLocation.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      name: data.name,
      code: data.code ?? null,
      type: data.type ?? 'office',
      status: data.status ?? 'active',
      isPrimary: data.isPrimary ?? false,
      phone: data.phone ?? null,
      email: data.email ?? null,
      line1: data.line1 ?? null,
      line2: data.line2 ?? null,
      city: data.city ?? null,
      regionId: data.regionId ?? null,
      countryCode: data.countryCode ?? null,
      postalCode: data.postalCode ?? null,
      timezone: data.timezone ?? null,
      metadata:
        (data.metadata as
          | Prisma.InputJsonValue
          | typeof Prisma.DbNull
          | null
          | undefined) ?? Prisma.DbNull,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  })
  return row as unknown as OrgLocationRow
}

export async function updateLocation(
  locationId: string,
  data: Record<string, unknown>
): Promise<OrgLocationRow | null> {
  try {
    const updateData: Record<string, unknown> = { ...data }
    if ('metadata' in updateData) {
      updateData.metadata =
        updateData.metadata === null ? Prisma.DbNull : updateData.metadata
    }
    const row = await prisma.orgLocation.update({
      where: { id: locationId },
      data: updateData as never,
    })
    return row as unknown as OrgLocationRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function deleteLocation(
  locationId: string,
  deletedBy: string | null
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.orgLocation.update({
    where: { id: locationId },
    data: { deletedAt: now, deletedBy, updatedAt: now },
  })
}

// Contacts

export async function listContactsByOrg(
  organizationId: string
): Promise<OrgContactRow[]> {
  const rows = await prisma.orgContact.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
  return rows as unknown as OrgContactRow[]
}

export async function findContactByIdForOrg(
  contactId: string,
  organizationId: string
): Promise<OrgContactRow | null> {
  const row = await prisma.orgContact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null },
  })
  return row as unknown as OrgContactRow | null
}

export async function clearPrimaryContactForOrg(
  organizationId: string
): Promise<void> {
  await prisma.orgContact.updateMany({
    where: { organizationId, isPrimary: true },
    data: { isPrimary: false },
  })
}

export async function createContact(data: {
  id: string
  organizationId: string
  userId?: string | null
  firstName: string
  lastName?: string | null
  title?: string | null
  type?: string | null
  isPrimary?: boolean | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  notes?: string | null
  metadata?: unknown | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrgContactRow> {
  const row = await prisma.orgContact.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      userId: data.userId ?? null,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      title: data.title ?? null,
      type: data.type ?? 'general',
      isPrimary: data.isPrimary ?? false,
      email: data.email ?? null,
      phone: data.phone ?? null,
      mobile: data.mobile ?? null,
      notes: data.notes ?? null,
      metadata:
        (data.metadata as
          | Prisma.InputJsonValue
          | typeof Prisma.DbNull
          | null
          | undefined) ?? Prisma.DbNull,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  })
  return row as unknown as OrgContactRow
}

export async function updateContact(
  contactId: string,
  data: Record<string, unknown>
): Promise<OrgContactRow | null> {
  try {
    const updateData: Record<string, unknown> = { ...data }
    if ('metadata' in updateData) {
      updateData.metadata =
        updateData.metadata === null ? Prisma.DbNull : updateData.metadata
    }
    const row = await prisma.orgContact.update({
      where: { id: contactId },
      data: updateData as never,
    })
    return row as unknown as OrgContactRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function deleteContact(
  contactId: string,
  deletedBy: string | null
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.orgContact.update({
    where: { id: contactId },
    data: { deletedAt: now, deletedBy, updatedAt: now },
  })
}

// Departments

export async function listDepartmentsByOrg(
  organizationId: string
): Promise<OrgDepartmentRow[]> {
  const rows = await prisma.orgDepartment.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
  return rows as unknown as OrgDepartmentRow[]
}

export async function findDepartmentByIdForOrg(
  departmentId: string,
  organizationId: string
): Promise<OrgDepartmentRow | null> {
  const row = await prisma.orgDepartment.findFirst({
    where: { id: departmentId, organizationId, deletedAt: null },
  })
  return row as unknown as OrgDepartmentRow | null
}

export async function createDepartment(data: {
  id: string
  organizationId: string
  name: string
  code?: string | null
  description?: string | null
  parentDepartmentId?: string | null
  headMembershipId?: string | null
  status?: string | null
  metadata?: unknown | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrgDepartmentRow> {
  const row = await prisma.orgDepartment.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      parentDepartmentId: data.parentDepartmentId ?? null,
      headMembershipId: data.headMembershipId ?? null,
      status: data.status ?? 'active',
      metadata:
        (data.metadata as
          | Prisma.InputJsonValue
          | typeof Prisma.DbNull
          | null
          | undefined) ?? Prisma.DbNull,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  })
  return row as unknown as OrgDepartmentRow
}

export async function updateDepartment(
  departmentId: string,
  data: Record<string, unknown>
): Promise<OrgDepartmentRow | null> {
  try {
    const updateData: Record<string, unknown> = { ...data }
    if ('metadata' in updateData) {
      updateData.metadata =
        updateData.metadata === null ? Prisma.DbNull : updateData.metadata
    }
    const row = await prisma.orgDepartment.update({
      where: { id: departmentId },
      data: updateData as never,
    })
    return row as unknown as OrgDepartmentRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function deleteDepartment(
  departmentId: string,
  deletedBy: string | null
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.orgDepartment.update({
    where: { id: departmentId },
    data: { deletedAt: now, deletedBy, updatedAt: now },
  })
}

// Employee profiles

export async function listEmployeesByOrg(
  organizationId: string
): Promise<EmployeeProfileRow[]> {
  const rows = await prisma.employeeProfile.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { membership: { select: { userId: true } } },
  })
  return rows as unknown as EmployeeProfileRow[]
}

export async function findEmployeeByIdForOrg(
  profileId: string,
  organizationId: string
): Promise<EmployeeProfileRow | null> {
  const row = await prisma.employeeProfile.findFirst({
    where: { id: profileId, organizationId, deletedAt: null },
    include: { membership: { select: { userId: true } } },
  })
  return row as unknown as EmployeeProfileRow | null
}

export async function findEmployeeByMembership(
  membershipId: string,
  includeDeleted = false
): Promise<EmployeeProfileRow | null> {
  const row = await prisma.employeeProfile.findFirst({
    where: { membershipId, ...(includeDeleted ? {} : { deletedAt: null }) },
  })
  return row as unknown as EmployeeProfileRow | null
}

export async function createEmployee(data: {
  id: string
  membershipId: string
  organizationId: string
  employeeNumber?: string | null
  jobTitle?: string | null
  departmentId?: string | null
  locationId?: string | null
  managerMembershipId?: string | null
  employmentType?: string | null
  employmentStatus?: string | null
  division?: string | null
  costCenter?: string | null
  workEmail?: string | null
  workPhone?: string | null
  startDate?: bigint | null
  endDate?: bigint | null
  metadata?: unknown | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<EmployeeProfileRow> {
  const row = await prisma.employeeProfile.create({
    data: {
      id: data.id,
      membershipId: data.membershipId,
      organizationId: data.organizationId,
      employeeNumber: data.employeeNumber ?? null,
      jobTitle: data.jobTitle ?? null,
      departmentId: data.departmentId ?? null,
      locationId: data.locationId ?? null,
      managerMembershipId: data.managerMembershipId ?? null,
      employmentType: data.employmentType ?? null,
      employmentStatus: data.employmentStatus ?? 'active',
      division: data.division ?? null,
      costCenter: data.costCenter ?? null,
      workEmail: data.workEmail ?? null,
      workPhone: data.workPhone ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      metadata:
        (data.metadata as
          | Prisma.InputJsonValue
          | typeof Prisma.DbNull
          | null
          | undefined) ?? Prisma.DbNull,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    include: { membership: { select: { userId: true } } },
  })
  return row as unknown as EmployeeProfileRow
}

export async function updateEmployee(
  profileId: string,
  data: Record<string, unknown>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...data }
  if ('metadata' in updateData) {
    updateData.metadata =
      updateData.metadata === null ? Prisma.DbNull : updateData.metadata
  }
  await prisma.employeeProfile.update({
    where: { id: profileId },
    data: updateData as never,
  })
}

export async function deleteEmployee(
  profileId: string,
  deletedBy: string | null
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.employeeProfile.update({
    where: { id: profileId },
    data: { deletedAt: now, deletedBy, updatedAt: now },
  })
}

// ---------------------------------------------------------------------------
// Membership, role, and organization reads the structure guards depend on
//
// These live here rather than in the service: `pnpm node:boundaries` fails on a
// service that imports the Prisma client, and splitting a module's data access
// across two layers makes it impossible to see what it touches.
// ---------------------------------------------------------------------------

export function findMembershipForUser(organizationId: string, userId: string) {
  return prisma.membership.findFirst({ where: { organizationId, userId } })
}

export function findMembershipById(membershipId: string) {
  return prisma.membership.findUnique({ where: { id: membershipId } })
}

export function findRoleForMembership(roleId: string, organizationId: string) {
  return prisma.organizationRole.findFirst({
    where: { id: roleId, organizationId },
  })
}

export function updateOrganizationDetails(
  organizationId: string,
  data: Prisma.OrganizationUpdateInput
) {
  return prisma.organization.update({ where: { id: organizationId }, data })
}
