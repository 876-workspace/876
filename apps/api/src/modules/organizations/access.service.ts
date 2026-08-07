import { AppHttpError } from '@/http/errors'
import { listObject, type ListObject } from '@/http/envelope'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import {
  ORG_PERMISSION_GROUPS,
  isValidOrgPermission,
  OWNER_ROLE_NAME,
} from '@/platform/permissions'
import { defaultPermissionsForRoleName } from '@/platform/permissions'

import * as repository from './access.repository'
import {
  serializeAppAssignment,
  serializeOrganizationMember,
  serializeOrganizationMemberMe,
  serializeOrganizationRole,
} from './access.serializers'
import type {
  AppAssignment,
  AppAssignmentCreate,
  OrganizationMember,
  OrganizationMemberMe,
  OrganizationMemberRoleUpdate,
  OrganizationRole,
  OrganizationRoleCreate,
  OrganizationRoleUpdate,
  PermissionCatalog,
} from './access.schemas'

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
  principal: Principal
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()
  const m = await repository.findMembershipForUser(orgId, principal.userId)
  if (!m || m.status !== 'active') throw forbidden()
}
async function requireOrgPermission(
  orgId: string,
  principal: Principal,
  permission: string
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()
  const m = await repository.findMembershipForUser(orgId, principal.userId)
  if (!m || m.status !== 'active') throw forbidden()
  const perms = await resolveMemberPermissions(m)
  if (!perms.has(permission)) throw forbidden()
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

function validatePermissions(permissions: string[]): string[] {
  const normalized = [...new Set(permissions)].sort()
  for (const p of normalized) {
    if (!isValidOrgPermission(p)) {
      throw new AppHttpError({
        code: 'role/unknown-permission',
        message: `Unknown permission: ${p}`,
        httpStatus: 400,
      })
    }
  }
  return normalized
}

export async function getPermissionCatalog(
  principal: Principal
): Promise<PermissionCatalog> {
  if (!principal.internal && !principal.userId) throw noSession()
  return {
    object: 'permission_catalog',
    groups: Object.entries(ORG_PERMISSION_GROUPS).map(
      ([name, permissions]) => ({
        name,
        permissions: [...permissions],
      })
    ),
  }
}

export async function listOrgRoles(
  orgId: string,
  principal: Principal
): Promise<ListObject<OrganizationRole>> {
  await requireOrgMembership(orgId, principal)
  const rows = await repository.listRolesByOrg(orgId)
  const data = await Promise.all(
    rows.map(async (row) =>
      serializeOrganizationRole(
        row,
        await repository.countMembershipsForRole(row.id)
      )
    )
  )
  return listObject({
    data,
    hasMore: false,
    url: `/organizations/${orgId}/roles`,
  })
}

export async function createOrgRole(
  orgId: string,
  body: OrganizationRoleCreate,
  principal: Principal
): Promise<OrganizationRole> {
  await requireOrgPermission(orgId, principal, 'roles:manage')
  const permissions = validatePermissions(body.permissions)
  if (await repository.findRoleByName(orgId, body.name)) {
    throw new AppHttpError({
      code: 'role/duplicate-name',
      message: 'A role with this name already exists in the organization.',
      httpStatus: 409,
    })
  }
  const now = BigInt(nowUnixSeconds())
  const role = await repository.createRole({
    id: generateId('role'),
    organizationId: orgId,
    name: body.name,
    displayName: body.display_name,
    description: body.description ?? null,
    permissions,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  })
  return serializeOrganizationRole(role, 0)
}

export async function retrieveOrgRole(
  orgId: string,
  roleId: string,
  principal: Principal
): Promise<OrganizationRole> {
  await requireOrgMembership(orgId, principal)
  const role = await repository.findRoleByIdForOrg(roleId, orgId)
  if (!role)
    throw notFound(
      'role/not-found',
      'No role exists with the provided identifier.'
    )
  return serializeOrganizationRole(
    role,
    await repository.countMembershipsForRole(role.id)
  )
}

export async function updateOrgRole(
  orgId: string,
  roleId: string,
  body: OrganizationRoleUpdate,
  principal: Principal
): Promise<OrganizationRole> {
  await requireOrgPermission(orgId, principal, 'roles:manage')
  const role = await repository.findRoleByIdForOrg(roleId, orgId)
  if (!role)
    throw notFound(
      'role/not-found',
      'No role exists with the provided identifier.'
    )
  if (role.isSystem) {
    throw new AppHttpError({
      code: 'role/system-immutable',
      message: 'Default system roles cannot be modified.',
      httpStatus: 400,
    })
  }
  const updateData: Record<string, unknown> = {
    updatedAt: BigInt(nowUnixSeconds()),
  }
  if (body.display_name !== undefined && body.display_name !== null)
    updateData.displayName = body.display_name
  if (body.description !== undefined) updateData.description = body.description
  if (body.permissions !== undefined && body.permissions !== null)
    updateData.permissions = validatePermissions(body.permissions)
  const updated = (await repository.updateRole(roleId, updateData)) ?? role
  return serializeOrganizationRole(
    updated as unknown as never,
    await repository.countMembershipsForRole(roleId)
  )
}

export async function deleteOrgRole(
  orgId: string,
  roleId: string,
  principal: Principal
): Promise<{ object: 'organization_role'; id: string; deleted: true }> {
  await requireOrgPermission(orgId, principal, 'roles:manage')
  const role = await repository.findRoleByIdForOrg(roleId, orgId)
  if (!role)
    throw notFound(
      'role/not-found',
      'No role exists with the provided identifier.'
    )
  if (role.isSystem) {
    throw new AppHttpError({
      code: 'role/system-immutable',
      message: 'Default system roles cannot be deleted.',
      httpStatus: 400,
    })
  }
  if ((await repository.countMembershipsForRole(roleId)) > 0) {
    throw new AppHttpError({
      code: 'role/in-use',
      message: 'This role is still assigned to members. Reassign them first.',
      httpStatus: 409,
    })
  }
  await repository.deleteRole(roleId)
  return { object: 'organization_role', id: roleId, deleted: true }
}

export async function listOrgMembers(
  orgId: string,
  principal: Principal,
  limit: number
): Promise<ListObject<OrganizationMember>> {
  await requireOrgPermission(orgId, principal, 'members:read')
  const { data, hasMore } = await repository.listMembersByOrg(orgId, limit)
  return listObject({
    data: data.map(serializeOrganizationMember),
    hasMore,
    url: `/organizations/${orgId}/members`,
  })
}

export async function retrieveOrgMemberMe(
  orgId: string,
  principal: Principal
): Promise<OrganizationMemberMe> {
  if (!principal.userId) throw noSession()
  const membership = await repository.findMembershipWithUser(
    orgId,
    principal.userId
  )
  if (!membership || membership.status !== 'active') throw forbidden()
  const perms = await resolveMemberPermissions(membership)
  return serializeOrganizationMemberMe(
    {
      id: membership.id,
      userId: membership.userId,
      role: membership.role,
      roleId: membership.roleId,
      status: membership.status,
      createdAt: membership.createdAt,
      user: membership.user,
    } as never,
    [...perms]
  )
}

export async function updateOrgMemberRole(
  orgId: string,
  membershipId: string,
  body: OrganizationMemberRoleUpdate,
  principal: Principal
): Promise<OrganizationMember> {
  await requireOrgPermission(orgId, principal, 'members:manage')
  const membership = await repository.findMembershipByIdWithUser(
    membershipId,
    orgId
  )
  if (!membership)
    throw notFound(
      'membership/not-found',
      'No membership exists with the provided identifier.'
    )
  const newRole = await repository.findRoleByName(orgId, body.role)
  if (!newRole)
    throw new AppHttpError({
      code: 'role/not-found',
      message: 'No role exists with the provided name.',
      httpStatus: 400,
    })
  const ownerInvolved = [membership.role, newRole.name].includes(
    OWNER_ROLE_NAME
  )
  if (ownerInvolved && !principal.internal) {
    const caller = await repository.findMembershipForUser(
      orgId,
      principal.userId ?? ''
    )
    if (!caller || caller.role !== OWNER_ROLE_NAME) {
      throw new AppHttpError({
        code: 'role/owner-required',
        message: 'Only an owner can grant or remove the owner role.',
        httpStatus: 403,
      })
    }
  }
  if (membership.role === OWNER_ROLE_NAME && newRole.name !== OWNER_ROLE_NAME) {
    const otherOwner = await repository.findOtherActiveOwner(
      orgId,
      OWNER_ROLE_NAME,
      membership.id
    )
    if (!otherOwner) {
      throw new AppHttpError({
        code: 'role/last-owner',
        message: 'An organization must keep at least one owner.',
        httpStatus: 400,
      })
    }
  }
  const updated = await repository.updateMembershipRole(membership.id, {
    role: newRole.name,
    roleId: newRole.id,
    updatedAt: BigInt(nowUnixSeconds()),
  })
  return serializeOrganizationMember({
    id: updated.id,
    userId: updated.userId,
    role: updated.role,
    roleId: updated.roleId,
    status: updated.status,
    createdAt: updated.createdAt,
    user: updated.user,
  } as never)
}

export async function deleteOrgMember(
  orgId: string,
  membershipId: string,
  principal: Principal
): Promise<{ object: 'organization_member'; id: string; deleted: true }> {
  await requireOrgPermission(orgId, principal, 'members:manage')
  const membership = await repository.findMembershipById(membershipId)
  if (!membership || membership.organizationId !== orgId) {
    throw notFound(
      'membership/not-found',
      'No membership exists with the provided identifier.'
    )
  }
  if (!principal.internal && membership.userId === principal.userId) {
    throw new AppHttpError({
      code: 'membership/self-removal-forbidden',
      message: 'You cannot remove yourself from the organization.',
      httpStatus: 400,
    })
  }
  if (membership.role === OWNER_ROLE_NAME) {
    if (!principal.internal) {
      const caller = await repository.findMembershipForUser(
        orgId,
        principal.userId ?? ''
      )
      if (!caller || caller.role !== OWNER_ROLE_NAME) {
        throw new AppHttpError({
          code: 'role/owner-required',
          message: 'Only an owner can remove an owner.',
          httpStatus: 403,
        })
      }
    }
    const otherOwner = await repository.findOtherActiveOwner(
      orgId,
      OWNER_ROLE_NAME,
      membershipId
    )
    if (!otherOwner) {
      throw new AppHttpError({
        code: 'role/last-owner',
        message: 'An organization must keep at least one owner.',
        httpStatus: 400,
      })
    }
  }
  const now = BigInt(nowUnixSeconds())
  await repository.softDeleteMembership(membershipId, principal.userId, now)
  return { object: 'organization_member', id: membershipId, deleted: true }
}

export async function listAppAssignments(
  orgId: string,
  principal: Principal,
  filters: {
    userId?: string | null
    appId?: string | null
    includeRevoked?: boolean
  }
): Promise<ListObject<AppAssignment>> {
  await requireOrgPermission(orgId, principal, 'apps:read')
  const rows = await repository.listAppAssignmentsByOrg(orgId, {
    userId: filters.userId ?? null,
    appId: filters.appId ?? null,
    includeRevoked: filters.includeRevoked ?? false,
  })
  return listObject({
    data: rows.map(serializeAppAssignment),
    hasMore: false,
    url: `/organizations/${orgId}/app-assignments`,
  })
}

export async function createAppAssignment(
  orgId: string,
  body: AppAssignmentCreate,
  principal: Principal
): Promise<AppAssignment> {
  await requireOrgPermission(orgId, principal, 'apps:assign')
  if (!body.app_id && !body.app_slug) {
    throw new AppHttpError({
      code: 'app-assignment/validation-failed',
      message: 'Provide app_id or app_slug.',
      httpStatus: 400,
    })
  }
  const app = body.app_id
    ? await repository.findAppById(body.app_id)
    : await repository.findAppBySlug(body.app_slug!)
  if (!app)
    throw notFound(
      'app-assignment/app-not-found',
      'No app exists with the provided identifier.'
    )
  const membership = await repository.findMembershipForUser(orgId, body.user_id)
  if (!membership || membership.status !== 'active') {
    throw notFound(
      'app-assignment/member-not-found',
      'This user is not an active member of the organization.'
    )
  }
  const subscription = await repository.findSubscription(orgId, app.id)
  if (!subscription || subscription.status !== 'active') {
    throw new AppHttpError({
      code: 'app-assignment/not-provisioned',
      message: 'The organization is not provisioned for this app.',
      httpStatus: 409,
    })
  }
  const now = BigInt(nowUnixSeconds())
  const assignment = await repository.assignApp({
    id: generateId('appAssignment'),
    organizationId: orgId,
    userId: body.user_id,
    appId: app.id,
    assignedBy: principal.userId,
    now,
  })
  return serializeAppAssignment(assignment)
}

export async function revokeAppAssignment(
  orgId: string,
  assignmentId: string,
  principal: Principal
): Promise<AppAssignment> {
  await requireOrgPermission(orgId, principal, 'apps:assign')
  const assignment = await repository.findAppAssignmentById(assignmentId)
  if (!assignment || assignment.organizationId !== orgId) {
    throw notFound(
      'app-assignment/not-found',
      'No assignment exists with the provided identifier.'
    )
  }
  const now = BigInt(nowUnixSeconds())
  const revoked =
    (await repository.revokeAppAssignment(assignmentId, now)) ?? assignment
  return serializeAppAssignment(revoked)
}
