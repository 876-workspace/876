import { prisma } from '@/db/client'

import type {
  AppAssignmentRow,
  AppPermissionRow,
  AppRoleRow,
} from './app-access.serializers'

const PERMISSION_SELECT = {
  id: true,
  appId: true,
  key: true,
  moduleKey: true,
  action: true,
  label: true,
  description: true,
  isDangerous: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const

const ROLE_SELECT = {
  id: true,
  appId: true,
  organizationId: true,
  key: true,
  name: true,
  description: true,
  permissions: true,
  isSystem: true,
  isDefault: true,
  templateKey: true,
  position: true,
  deletedAt: true,
  deletedBy: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
} as const

const ASSIGNMENT_SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  appId: true,
  appRoleId: true,
  status: true,
  permissionGrants: true,
  permissionDenies: true,
  title: true,
  attributes: true,
  assignedBy: true,
  assignedAt: true,
  lastAccessAt: true,
  revokedAt: true,
  revokedBy: true,
  deletedAt: true,
  deletedBy: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
  appRole: { select: ROLE_SELECT },
} as const

export function listPermissions(appId: string): Promise<AppPermissionRow[]> {
  return prisma.appPermission.findMany({
    where: { appId },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
    select: PERMISSION_SELECT,
  }) as Promise<AppPermissionRow[]>
}

export function listPermissionsForApps(
  appIds: readonly string[]
): Promise<AppPermissionRow[]> {
  return prisma.appPermission.findMany({
    where: { appId: { in: [...appIds] } },
    orderBy: [{ appId: 'asc' }, { position: 'asc' }, { key: 'asc' }],
    select: PERMISSION_SELECT,
  }) as Promise<AppPermissionRow[]>
}

export function findPermission(
  appId: string,
  permissionId: string
): Promise<AppPermissionRow | null> {
  return prisma.appPermission.findFirst({
    where: { id: permissionId, appId },
    select: PERMISSION_SELECT,
  }) as Promise<AppPermissionRow | null>
}

export function findPermissionByKey(
  appId: string,
  key: string
): Promise<AppPermissionRow | null> {
  return prisma.appPermission.findFirst({
    where: { appId, key },
    select: PERMISSION_SELECT,
  }) as Promise<AppPermissionRow | null>
}

export function createPermission(data: {
  id: string
  appId: string
  key: string
  moduleKey: string
  action: string
  label: string
  description: string | null
  isDangerous: boolean
  position: number
  createdAt: bigint
  updatedAt: bigint
}): Promise<AppPermissionRow> {
  return prisma.appPermission.create({
    data,
    select: PERMISSION_SELECT,
  }) as Promise<AppPermissionRow>
}

export async function updatePermission(
  permissionId: string,
  data: {
    label?: string
    description?: string | null
    isDangerous?: boolean
    position?: number
    updatedAt: bigint
  }
): Promise<AppPermissionRow | null> {
  try {
    return (await prisma.appPermission.update({
      where: { id: permissionId },
      data,
      select: PERMISSION_SELECT,
    })) as AppPermissionRow
  } catch {
    return null
  }
}

export async function deletePermission(permissionId: string): Promise<boolean> {
  try {
    await prisma.appPermission.delete({ where: { id: permissionId } })
    return true
  } catch {
    return false
  }
}

export function countRolesUsingPermission(
  appId: string,
  permissionKey: string
): Promise<number> {
  return prisma.appRole.count({
    where: { appId, deletedAt: null, permissions: { has: permissionKey } },
  })
}

export async function syncPermissions(
  appId: string,
  rows: Array<{
    id: string
    key: string
    moduleKey: string
    action: string
    label: string
    description: string | null
    isDangerous: boolean
    position: number
  }>,
  now: bigint
): Promise<AppPermissionRow[]> {
  await prisma.$transaction(async (tx) => {
    const keys = rows.map((row) => row.key)
    await tx.appPermission.deleteMany({
      where: { appId, key: { notIn: keys } },
    })
    for (const row of rows) {
      const existing = await tx.appPermission.findFirst({
        where: { appId, key: row.key },
      })
      if (existing) {
        await tx.appPermission.update({
          where: { id: existing.id },
          data: {
            moduleKey: row.moduleKey,
            action: row.action,
            label: row.label,
            description: row.description,
            isDangerous: row.isDangerous,
            position: row.position,
            updatedAt: now,
          },
        })
      } else {
        await tx.appPermission.create({
          data: { ...row, appId, createdAt: now, updatedAt: now },
        })
      }
    }
  })
  return listPermissions(appId)
}

function roleScope(appId: string, organizationId: string | null) {
  return { appId, organizationId, deletedAt: null }
}

export function listRoles(
  appId: string,
  organizationId: string | null
): Promise<AppRoleRow[]> {
  return prisma.appRole.findMany({
    where: roleScope(appId, organizationId),
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
    select: ROLE_SELECT,
  }) as Promise<AppRoleRow[]>
}

export function findRole(
  appId: string,
  organizationId: string | null,
  roleId: string
): Promise<AppRoleRow | null> {
  return prisma.appRole.findFirst({
    where: { id: roleId, ...roleScope(appId, organizationId) },
    select: ROLE_SELECT,
  }) as Promise<AppRoleRow | null>
}

export function findRoleByKey(
  appId: string,
  organizationId: string | null,
  key: string
): Promise<AppRoleRow | null> {
  return prisma.appRole.findFirst({
    where: { key, ...roleScope(appId, organizationId) },
    select: ROLE_SELECT,
  }) as Promise<AppRoleRow | null>
}

export function findDefaultRole(
  appId: string,
  organizationId: string | null
): Promise<AppRoleRow | null> {
  return prisma.appRole.findFirst({
    where: { ...roleScope(appId, organizationId), isDefault: true },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
    select: ROLE_SELECT,
  }) as Promise<AppRoleRow | null>
}

export function countRoles(
  appId: string,
  organizationId: string | null
): Promise<number> {
  return prisma.appRole.count({ where: roleScope(appId, organizationId) })
}

export async function createRole(data: {
  id: string
  appId: string
  organizationId: string | null
  key: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
  templateKey: string | null
  position: number
  createdAt: bigint
  updatedAt: bigint
}): Promise<AppRoleRow> {
  return prisma.$transaction(async (tx) => {
    if (data.isDefault)
      await tx.appRole.updateMany({
        where: roleScope(data.appId, data.organizationId),
        data: { isDefault: false, updatedAt: data.updatedAt },
      })
    return (await tx.appRole.create({
      data,
      select: ROLE_SELECT,
    })) as AppRoleRow
  })
}

export async function updateRole(
  roleId: string,
  appId: string,
  organizationId: string | null,
  data: {
    key?: string
    name?: string
    description?: string | null
    permissions?: string[]
    isSystem?: boolean
    isDefault?: boolean
    position?: number
    updatedAt: bigint
  }
): Promise<AppRoleRow | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      if (data.isDefault === true)
        await tx.appRole.updateMany({
          where: { ...roleScope(appId, organizationId), id: { not: roleId } },
          data: { isDefault: false, updatedAt: data.updatedAt },
        })
      return (await tx.appRole.update({
        where: { id: roleId },
        data,
        select: ROLE_SELECT,
      })) as AppRoleRow
    })
  } catch {
    return null
  }
}

export async function softDeleteRole(
  role: AppRoleRow,
  deletedBy: string | null,
  now: bigint
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.appRole.update({
        where: { id: role.id },
        data: {
          deletedAt: now,
          deletedBy,
          deletionReason: 'deleted',
          isDefault: false,
          updatedAt: now,
        },
      })
      if (role.isDefault) {
        const replacement = await tx.appRole.findFirst({
          where: roleScope(role.appId, role.organizationId),
          orderBy: [{ position: 'asc' }, { key: 'asc' }],
          select: { id: true },
        })
        if (replacement)
          await tx.appRole.update({
            where: { id: replacement.id },
            data: { isDefault: true, updatedAt: now },
          })
      }
    })
    return true
  } catch {
    return false
  }
}

export function countAssignmentsForRole(roleId: string): Promise<number> {
  return prisma.appAssignment.count({ where: { appRoleId: roleId } })
}

export function countActiveAssignmentsForRole(roleId: string): Promise<number> {
  return prisma.appAssignment.count({
    where: {
      appRoleId: roleId,
      status: 'active',
      revokedAt: null,
      deletedAt: null,
    },
  })
}

export function listAssignments(
  organizationId: string,
  filters: {
    userId?: string | null
    appId?: string | null
    status?: string | null
    includeRevoked: boolean
  }
): Promise<AppAssignmentRow[]> {
  return prisma.appAssignment.findMany({
    where: {
      organizationId,
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.appId ? { appId: filters.appId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.includeRevoked
        ? {}
        : { deletedAt: null, revokedAt: null, status: { not: 'revoked' } }),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow[]>
}

export function listAssignmentsForUserApps(
  organizationId: string,
  userId: string,
  appIds: readonly string[]
): Promise<AppAssignmentRow[]> {
  return prisma.appAssignment.findMany({
    where: { organizationId, userId, appId: { in: [...appIds] } },
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow[]>
}

export function listAssignmentsForApp(
  organizationId: string,
  appId: string,
  includeRevoked = false
): Promise<AppAssignmentRow[]> {
  return prisma.appAssignment.findMany({
    where: {
      organizationId,
      appId,
      ...(includeRevoked
        ? {}
        : { deletedAt: null, revokedAt: null, status: 'active' }),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow[]>
}

export function findAssignment(
  organizationId: string,
  assignmentId: string
): Promise<AppAssignmentRow | null> {
  return prisma.appAssignment.findFirst({
    where: { id: assignmentId, organizationId },
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow | null>
}

export function findAssignmentForUserApp(
  organizationId: string,
  userId: string,
  appId: string
): Promise<AppAssignmentRow | null> {
  return prisma.appAssignment.findFirst({
    where: { organizationId, userId, appId },
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow | null>
}

export function createAssignment(data: {
  id: string
  organizationId: string
  userId: string
  appId: string
  appRoleId: string | null
  status: string
  permissionGrants: string[]
  permissionDenies: string[]
  title: string | null
  attributes: Record<string, unknown> | null
  assignedBy: string | null
  assignedAt: bigint
  createdAt: bigint
  updatedAt: bigint
}): Promise<AppAssignmentRow> {
  return prisma.appAssignment.create({
    data: data as never,
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow>
}

export function reactivateAssignment(
  assignmentId: string,
  data: {
    appRoleId: string | null
    status: string
    permissionGrants: string[]
    permissionDenies: string[]
    title: string | null
    attributes: Record<string, unknown> | null
    assignedBy: string | null
    assignedAt: bigint
    updatedAt: bigint
  }
): Promise<AppAssignmentRow> {
  return prisma.appAssignment.update({
    where: { id: assignmentId },
    data: {
      ...data,
      revokedAt: null,
      revokedBy: null,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
    } as never,
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow>
}

export function updateAssignment(
  assignmentId: string,
  data: {
    appRoleId?: string | null
    status?: string
    permissionGrants?: string[]
    permissionDenies?: string[]
    title?: string | null
    attributes?: Record<string, unknown> | null
    revokedAt?: bigint | null
    revokedBy?: string | null
    deletedAt?: bigint | null
    deletedBy?: string | null
    deletionReason?: string | null
    updatedAt: bigint
  }
): Promise<AppAssignmentRow> {
  return prisma.appAssignment.update({
    where: { id: assignmentId },
    data: data as never,
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow>
}

export function revokeAssignment(
  assignmentId: string,
  revokedBy: string | null,
  now: bigint
): Promise<AppAssignmentRow> {
  return prisma.appAssignment.update({
    where: { id: assignmentId },
    data: {
      status: 'revoked',
      revokedAt: now,
      revokedBy,
      deletedAt: now,
      deletedBy: revokedBy,
      deletionReason: 'revoked',
      updatedAt: now,
    },
    select: ASSIGNMENT_SELECT,
  }) as Promise<AppAssignmentRow>
}
