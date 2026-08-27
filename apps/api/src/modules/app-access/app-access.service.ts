import { listObject, type ListObject } from '@/http/envelope'
import {
  findAppForAccessById,
  findAppForAccessBySlug,
  listAppsForAccess,
} from '@/modules/apps'
import {
  findMembershipForAccess,
  findMembershipForAccessById,
  listMembershipsForAccess,
} from '@/modules/memberships'
import {
  getOrgAppEntitlement,
  listOrgAppEntitlements,
  requireOrgAppAccessPermission,
  requireOrgAppAccessRead,
  type OrgAccessPrincipal,
} from '@/modules/organizations'
import { AppHttpError, appError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './app-access.repository'
import type {
  AppAssignmentRow,
  AppPermissionRow,
  AppRoleRow,
} from './app-access.serializers'
import {
  serializeAppMembership,
  serializeAppPermission,
  serializeAppRole,
} from './app-access.serializers'
import type {
  AppMembership,
  AppPermission,
  AppRole,
  CreateAppMembershipBody,
  CreateAppPermissionBody,
  CreateAppRoleBody,
  ListAppMembershipsQuery,
  SyncAppPermissionsBody,
  UpdateAppMembershipBody,
  UpdateAppPermissionBody,
  UpdateAppRoleBody,
} from './app-access.schemas'

const ENTITLED_STATUSES = new Set(['active', 'trialing'])
const ENTERPRISE_SLUG = '876-enterprise'

type AccessApp = {
  id: string
  slug: string
  name: string
}

type AccessMembership = {
  id: string
  organization_id: string
  user_id: string
  status: string
}

export type EffectiveAppPermissionResolution = {
  entitled: boolean
  assigned: boolean
  role: AppRoleRow | null
  permissions: string[]
}

function safeStrings(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set()
  return new Set(value.filter((item): item is string => typeof item === 'string'))
}

/**
 * Resolves the effective app permission set from already-loaded data.
 * Authorization resolution is deliberately total: malformed historical rows
 * degrade to the safe value rather than turning an access check into a 500.
 */
export function resolveEffectiveAppPermissions(input: {
  entitlement: unknown
  assignment: unknown
  appRole: unknown
  catalog: unknown
}): EffectiveAppPermissionResolution {
  try {
    const entitlement =
      typeof input.entitlement === 'object' && input.entitlement !== null
        ? (input.entitlement as Record<string, unknown>)
        : null
    const entitled =
      typeof entitlement?.status === 'string' &&
      ENTITLED_STATUSES.has(entitlement.status)
    if (!entitled)
      return { entitled: false, assigned: false, role: null, permissions: [] }

    const assignment =
      typeof input.assignment === 'object' && input.assignment !== null
        ? (input.assignment as Record<string, unknown>)
        : null
    const assigned =
      assignment?.status === 'active' &&
      (assignment.deletedAt === null || assignment.deletedAt === undefined) &&
      (assignment.revokedAt === null || assignment.revokedAt === undefined)
    if (!assigned)
      return { entitled: true, assigned: false, role: null, permissions: [] }

    const rawRole =
      typeof input.appRole === 'object' && input.appRole !== null
        ? (input.appRole as Record<string, unknown>)
        : null
    const roleIsLive =
      rawRole !== null &&
      (rawRole.deletedAt === null || rawRole.deletedAt === undefined)
    const role = roleIsLive ? (input.appRole as AppRoleRow) : null
    const effective = role ? safeStrings(rawRole?.permissions) : new Set<string>()
    const grants = safeStrings(assignment.permissionGrants)
    const denies = safeStrings(assignment.permissionDenies)

    for (const grant of grants) effective.add(grant)
    for (const deny of denies) effective.delete(deny)

    const catalog = Array.isArray(input.catalog) ? input.catalog : []
    const catalogKeys = new Set(
      catalog
        .map((entry) =>
          typeof entry === 'string'
            ? entry
            : typeof entry === 'object' && entry !== null && 'key' in entry
              ? (entry as { key?: unknown }).key
              : null
        )
        .filter((key): key is string => typeof key === 'string')
    )

    return {
      entitled: true,
      assigned: true,
      role,
      permissions: [...effective].filter((key) => catalogKeys.has(key)).sort(),
    }
  } catch {
    return { entitled: false, assigned: false, role: null, permissions: [] }
  }
}

function appOrNotFound(app: Awaited<ReturnType<typeof findAppForAccessById>>): AccessApp {
  if (!app)
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  return { id: app.id, slug: app.slug, name: app.name }
}

async function resolveApp(input: {
  appId?: string | null
  appSlug?: string | null
}): Promise<AccessApp> {
  const app = input.appId
    ? await findAppForAccessById(input.appId)
    : input.appSlug
      ? await findAppForAccessBySlug(input.appSlug)
      : null
  return appOrNotFound(app)
}

function ensureAssignableApp(app: AccessApp): void {
  if (app.slug === ENTERPRISE_SLUG) throw appError('app-membership/app-not-assignable')
}

function isEntitled(entitlement: { status: string } | null): boolean {
  return Boolean(entitlement && ENTITLED_STATUSES.has(entitlement.status))
}

async function requireEntitlement(
  organizationId: string,
  appId: string
): Promise<{ appId: string; status: string }> {
  const entitlement = await getOrgAppEntitlement(organizationId, appId)
  if (!entitlement || !ENTITLED_STATUSES.has(entitlement.status))
    throw appError('app-membership/not-entitled')
  return entitlement
}

function normalizePermissions(permissions: readonly string[]): string[] {
  return [...new Set(permissions)].sort()
}

async function validateCatalogSubset(appId: string, permissions: readonly string[]): Promise<string[]> {
  const normalized = normalizePermissions(permissions)
  const catalog = await repository.listPermissions(appId)
  const allowed = new Set(catalog.map((permission) => permission.key))
  if (normalized.some((permission) => !allowed.has(permission)))
    throw appError('app-role/unknown-permission')
  return normalized
}

function validatePermissionIdentity(body: CreateAppPermissionBody): void {
  if (body.key !== `${body.module_key}.${body.action}`)
    throw appError('app-role/unknown-permission', {
      message: 'The permission key must match its module and action.',
    })
}

async function requireTargetMembership(params: {
  organizationId: string
  userId?: string
  membershipId?: string
}): Promise<AccessMembership> {
  const membership = params.membershipId
    ? await findMembershipForAccessById(params.organizationId, params.membershipId)
    : params.userId
      ? await findMembershipForAccess(params.organizationId, params.userId)
      : null

  if (
    !membership ||
    membership.status !== 'active' ||
    (params.userId && membership.user_id !== params.userId)
  )
    throw appError('app-membership/not-a-member')

  return {
    id: membership.id,
    organization_id: membership.organization_id,
    user_id: membership.user_id,
    status: membership.status,
  }
}

async function requireRole(params: {
  appId: string
  organizationId: string | null
  roleId: string
}): Promise<AppRoleRow> {
  const role = await repository.findRole(params.appId, params.organizationId, params.roleId)
  if (!role) throw appError('app-role/not-found')
  return role
}

async function profileFromLoaded(params: {
  assignment: AppAssignmentRow | null
  membership: AccessMembership
  app: AccessApp
  entitlement: { status: string } | null
  catalog: AppPermissionRow[]
}): Promise<AppMembership> {
  const resolution = resolveEffectiveAppPermissions({
    entitlement: params.entitlement,
    assignment: params.assignment,
    appRole: params.assignment?.appRole ?? null,
    catalog: params.catalog,
  })
  return serializeAppMembership({
    assignment: params.assignment,
    organizationId: params.membership.organization_id,
    membershipId: params.membership.id,
    userId: params.membership.user_id,
    app: params.app,
    entitled: resolution.entitled,
    assigned: resolution.assigned,
    role: resolution.role,
    permissions: resolution.permissions,
  })
}

async function ensureNotLastAdmin(
  assignment: AppAssignmentRow,
  next: { roleId?: string | null; status?: string; deleting?: boolean }
): Promise<void> {
  const currentRole = assignment.appRole
  if (!currentRole || currentRole.key !== 'admin') return

  const leavesAdmin =
    next.deleting === true ||
    (next.status !== undefined && next.status !== 'active') ||
    (next.roleId !== undefined && next.roleId !== currentRole.id)
  if (!leavesAdmin) return

  if ((await repository.countActiveAssignmentsForRole(currentRole.id)) <= 1)
    throw appError('app-role/last-admin')
}

// ---------------------------------------------------------------------------
// Platform permission catalog
// ---------------------------------------------------------------------------

export async function listAppPermissions(appId: string): Promise<ListObject<AppPermission>> {
  appOrNotFound(await findAppForAccessById(appId))
  const rows = await repository.listPermissions(appId)
  return listObject({ data: rows.map(serializeAppPermission), hasMore: false, url: `/apps/${appId}/permissions` })
}

export async function createAppPermission(
  appId: string,
  body: CreateAppPermissionBody
): Promise<AppPermission> {
  appOrNotFound(await findAppForAccessById(appId))
  validatePermissionIdentity(body)
  if (await repository.findPermissionByKey(appId, body.key))
    throw appError('app-permission/duplicate')

  const now = BigInt(nowUnixSeconds())
  const row = await repository.createPermission({
    id: generateId('permission'),
    appId,
    key: body.key,
    moduleKey: body.module_key,
    action: body.action,
    label: body.label,
    description: body.description ?? null,
    isDangerous: body.is_dangerous,
    position: body.position,
    createdAt: now,
    updatedAt: now,
  })
  return serializeAppPermission(row)
}

export async function updateAppPermission(
  appId: string,
  permissionId: string,
  body: UpdateAppPermissionBody
): Promise<AppPermission> {
  appOrNotFound(await findAppForAccessById(appId))
  const existing = await repository.findPermission(appId, permissionId)
  if (!existing) throw appError('app-permission/not-found')
  const row = await repository.updatePermission(permissionId, {
    ...(body.label !== undefined ? { label: body.label } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.is_dangerous !== undefined ? { isDangerous: body.is_dangerous } : {}),
    ...(body.position !== undefined ? { position: body.position } : {}),
    updatedAt: BigInt(nowUnixSeconds()),
  })
  if (!row) throw appError('app-permission/not-found')
  return serializeAppPermission(row)
}

export async function deleteAppPermission(
  appId: string,
  permissionId: string
): Promise<{ object: 'app_permission'; id: string; deleted: true }> {
  const existing = await repository.findPermission(appId, permissionId)
  if (!existing) throw appError('app-permission/not-found')
  if ((await repository.countRolesUsingPermission(appId, existing.key)) > 0)
    throw appError('app-role/in-use', {
      message: 'This permission is still referenced by an app role.',
    })
  if (!(await repository.deletePermission(permissionId)))
    throw appError('app-permission/not-found')
  return { object: 'app_permission', id: permissionId, deleted: true }
}

export async function syncAppPermissions(
  appId: string,
  body: SyncAppPermissionsBody
): Promise<ListObject<AppPermission>> {
  appOrNotFound(await findAppForAccessById(appId))
  const seen = new Set<string>()
  for (const permission of body.permissions) {
    validatePermissionIdentity(permission)
    if (seen.has(permission.key)) throw appError('app-permission/duplicate')
    seen.add(permission.key)
  }

  const existing = await repository.listPermissions(appId)
  for (const permission of existing) {
    if (!seen.has(permission.key) && (await repository.countRolesUsingPermission(appId, permission.key)) > 0)
      throw appError('app-role/in-use', {
        message: 'A permission being removed is still referenced by an app role.',
      })
  }

  const rows = await repository.syncPermissions(
    appId,
    body.permissions.map((permission) => ({
      id: generateId('permission'),
      key: permission.key,
      moduleKey: permission.module_key,
      action: permission.action,
      label: permission.label,
      description: permission.description ?? null,
      isDangerous: permission.is_dangerous,
      position: permission.position,
    })),
    BigInt(nowUnixSeconds())
  )
  return listObject({ data: rows.map(serializeAppPermission), hasMore: false, url: `/apps/${appId}/permissions` })
}

// ---------------------------------------------------------------------------
// Role templates and organization app roles
// ---------------------------------------------------------------------------

async function listRolesSerialized(
  appId: string,
  organizationId: string | null,
  url: string
): Promise<ListObject<AppRole>> {
  const rows = await repository.listRoles(appId, organizationId)
  const data = await Promise.all(
    rows.map(async (role) => serializeAppRole(role, await repository.countAssignmentsForRole(role.id)))
  )
  return listObject({ data, hasMore: false, url })
}

async function createRole(params: {
  app: AccessApp
  organizationId: string | null
  body: CreateAppRoleBody
  templateKey?: string | null
}): Promise<AppRole> {
  ensureAssignableApp(params.app)
  if (await repository.findRoleByKey(params.app.id, params.organizationId, params.body.key))
    throw appError('app-role/duplicate-key')
  const permissions = await validateCatalogSubset(params.app.id, params.body.permissions)
  const roleCount = await repository.countRoles(params.app.id, params.organizationId)
  const now = BigInt(nowUnixSeconds())
  const row = await repository.createRole({
    id: generateId('role'),
    appId: params.app.id,
    organizationId: params.organizationId,
    key: params.body.key,
    name: params.body.name,
    description: params.body.description ?? null,
    permissions,
    isSystem: params.organizationId === null ? params.body.is_system : false,
    isDefault: roleCount === 0 ? true : params.body.is_default,
    templateKey: params.templateKey ?? null,
    position: params.body.position,
    createdAt: now,
    updatedAt: now,
  })
  return serializeAppRole(row, 0)
}

async function updateRole(params: {
  app: AccessApp
  organizationId: string | null
  roleId: string
  body: UpdateAppRoleBody
  allowSystemTemplatePresentation: boolean
}): Promise<AppRole> {
  const role = await requireRole({
    appId: params.app.id,
    organizationId: params.organizationId,
    roleId: params.roleId,
  })

  if (role.isSystem) {
    if (!params.allowSystemTemplatePresentation || params.organizationId !== null)
      throw appError('app-role/system-immutable')
    const changesManagedFields =
      params.body.key !== undefined ||
      params.body.permissions !== undefined ||
      params.body.is_system !== undefined ||
      params.body.is_default !== undefined
    if (changesManagedFields) throw appError('app-role/system-immutable')
  }

  if (params.organizationId !== null && params.body.is_system !== undefined)
    throw appError('app-role/system-immutable')

  if (
    params.body.key !== undefined &&
    params.body.key !== role.key &&
    (await repository.findRoleByKey(params.app.id, params.organizationId, params.body.key))
  )
    throw appError('app-role/duplicate-key')

  const permissions =
    params.body.permissions === undefined
      ? undefined
      : await validateCatalogSubset(params.app.id, params.body.permissions)

  const updated = await repository.updateRole(
    role.id,
    params.app.id,
    params.organizationId,
    {
      ...(params.body.key !== undefined ? { key: params.body.key } : {}),
      ...(params.body.name !== undefined ? { name: params.body.name } : {}),
      ...(params.body.description !== undefined ? { description: params.body.description } : {}),
      ...(permissions !== undefined ? { permissions } : {}),
      ...(params.body.is_system !== undefined ? { isSystem: params.body.is_system } : {}),
      ...(params.body.is_default !== undefined ? { isDefault: params.body.is_default } : {}),
      ...(params.body.position !== undefined ? { position: params.body.position } : {}),
      updatedAt: BigInt(nowUnixSeconds()),
    }
  )
  if (!updated) throw appError('app-role/not-found')
  return serializeAppRole(updated, await repository.countAssignmentsForRole(updated.id))
}

async function deleteRole(params: {
  app: AccessApp
  organizationId: string | null
  roleId: string
  actorId: string | null
  protectSystem: boolean
}): Promise<{ object: 'app_role'; id: string; deleted: true }> {
  const role = await requireRole({
    appId: params.app.id,
    organizationId: params.organizationId,
    roleId: params.roleId,
  })
  if (params.protectSystem && role.isSystem) throw appError('app-role/system-immutable')
  if ((await repository.countAssignmentsForRole(role.id)) > 0) throw appError('app-role/in-use')
  if (!(await repository.softDeleteRole(role, params.actorId, BigInt(nowUnixSeconds()))))
    throw appError('app-role/not-found')
  return { object: 'app_role', id: role.id, deleted: true }
}

export async function listAppRoleTemplates(appId: string): Promise<ListObject<AppRole>> {
  const app = appOrNotFound(await findAppForAccessById(appId))
  ensureAssignableApp(app)
  return listRolesSerialized(app.id, null, `/apps/${app.id}/roles`)
}

export async function createAppRoleTemplate(
  appId: string,
  body: CreateAppRoleBody
): Promise<AppRole> {
  const app = appOrNotFound(await findAppForAccessById(appId))
  return createRole({ app, organizationId: null, body })
}

export async function retrieveAppRoleTemplate(appId: string, roleId: string): Promise<AppRole> {
  const app = appOrNotFound(await findAppForAccessById(appId))
  const role = await requireRole({ appId: app.id, organizationId: null, roleId })
  return serializeAppRole(role, await repository.countAssignmentsForRole(role.id))
}

export async function updateAppRoleTemplate(
  appId: string,
  roleId: string,
  body: UpdateAppRoleBody
): Promise<AppRole> {
  const app = appOrNotFound(await findAppForAccessById(appId))
  return updateRole({ app, organizationId: null, roleId, body, allowSystemTemplatePresentation: true })
}

export async function deleteAppRoleTemplate(
  appId: string,
  roleId: string
): Promise<{ object: 'app_role'; id: string; deleted: true }> {
  const app = appOrNotFound(await findAppForAccessById(appId))
  return deleteRole({ app, organizationId: null, roleId, actorId: null, protectSystem: false })
}

export async function listOrgAppRoles(
  organizationId: string,
  appId: string,
  principal: OrgAccessPrincipal
): Promise<ListObject<AppRole>> {
  await requireOrgAppAccessRead(organizationId, principal)
  const app = appOrNotFound(await findAppForAccessById(appId))
  ensureAssignableApp(app)
  await requireEntitlement(organizationId, app.id)
  return listRolesSerialized(app.id, organizationId, `/organizations/${organizationId}/apps/${app.id}/roles`)
}

export async function createOrgAppRole(
  organizationId: string,
  appId: string,
  body: CreateAppRoleBody,
  principal: OrgAccessPrincipal
): Promise<AppRole> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  const app = appOrNotFound(await findAppForAccessById(appId))
  ensureAssignableApp(app)
  await requireEntitlement(organizationId, app.id)
  return createRole({ app, organizationId, body: { ...body, is_system: false } })
}

export async function retrieveOrgAppRole(
  organizationId: string,
  appId: string,
  roleId: string,
  principal: OrgAccessPrincipal
): Promise<AppRole> {
  await requireOrgAppAccessRead(organizationId, principal)
  const app = appOrNotFound(await findAppForAccessById(appId))
  await requireEntitlement(organizationId, app.id)
  const role = await requireRole({ appId: app.id, organizationId, roleId })
  return serializeAppRole(role, await repository.countAssignmentsForRole(role.id))
}

export async function updateOrgAppRole(
  organizationId: string,
  appId: string,
  roleId: string,
  body: UpdateAppRoleBody,
  principal: OrgAccessPrincipal
): Promise<AppRole> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  const app = appOrNotFound(await findAppForAccessById(appId))
  await requireEntitlement(organizationId, app.id)
  return updateRole({ app, organizationId, roleId, body, allowSystemTemplatePresentation: false })
}

export async function deleteOrgAppRole(
  organizationId: string,
  appId: string,
  roleId: string,
  principal: OrgAccessPrincipal
): Promise<{ object: 'app_role'; id: string; deleted: true }> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  const app = appOrNotFound(await findAppForAccessById(appId))
  await requireEntitlement(organizationId, app.id)
  return deleteRole({
    app,
    organizationId,
    roleId,
    actorId: principal.userId,
    protectSystem: true,
  })
}

// ---------------------------------------------------------------------------
// App membership profiles
// ---------------------------------------------------------------------------

export async function listAppMemberships(
  organizationId: string,
  query: ListAppMembershipsQuery,
  principal: OrgAccessPrincipal
): Promise<ListObject<AppMembership>> {
  await requireOrgAppAccessRead(organizationId, principal)

  let userId = query.user_id ?? null
  if (query.membership_id) {
    const membership = await findMembershipForAccessById(organizationId, query.membership_id)
    if (!membership) throw appError('app-membership/not-found')
    userId = membership.user_id
  }
  let appId = query.app_id ?? null
  if (query.app_slug) appId = (await resolveApp({ appSlug: query.app_slug })).id

  const assignments = await repository.listAssignments(organizationId, {
    userId,
    appId,
    status: query.status ?? null,
    includeRevoked: query.include_revoked,
  })
  const memberships = await listMembershipsForAccess(
    organizationId,
    assignments.map((assignment) => assignment.userId)
  )
  const apps = await listAppsForAccess(assignments.map((assignment) => assignment.appId))
  const entitlements = await listOrgAppEntitlements(organizationId)
  const catalogs = await repository.listPermissionsForApps(apps.map((app) => app.id))
  const membershipByUser = new Map(memberships.map((membership) => [membership.user_id, membership]))
  const appById = new Map(apps.map((app) => [app.id, { id: app.id, slug: app.slug, name: app.name }]))
  const entitlementByApp = new Map(entitlements.map((entitlement) => [entitlement.appId, entitlement]))
  const catalogByApp = new Map<string, AppPermissionRow[]>()
  for (const permission of catalogs) {
    const rows = catalogByApp.get(permission.appId) ?? []
    rows.push(permission)
    catalogByApp.set(permission.appId, rows)
  }

  const data: AppMembership[] = []
  for (const assignment of assignments) {
    const membership = membershipByUser.get(assignment.userId)
    const app = appById.get(assignment.appId)
    if (!membership || !app) continue
    data.push(
      await profileFromLoaded({
        assignment,
        membership,
        app,
        entitlement: entitlementByApp.get(app.id) ?? null,
        catalog: catalogByApp.get(app.id) ?? [],
      })
    )
  }
  return listObject({ data, hasMore: false, url: `/organizations/${organizationId}/app-memberships` })
}

export async function createAppMembership(
  organizationId: string,
  body: CreateAppMembershipBody,
  principal: OrgAccessPrincipal
): Promise<AppMembership> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  const app = await resolveApp({ appId: body.app_id, appSlug: body.app_slug })
  ensureAssignableApp(app)
  const entitlement = await requireEntitlement(organizationId, app.id)
  const membership = await requireTargetMembership({
    organizationId,
    userId: body.user_id,
    membershipId: body.membership_id,
  })

  const role = body.app_role_id
    ? await requireRole({ appId: app.id, organizationId, roleId: body.app_role_id })
    : await repository.findDefaultRole(app.id, organizationId)
  if (!role) throw appError('app-role/not-found')

  const grants = await validateCatalogSubset(app.id, body.permission_grants)
  const denies = await validateCatalogSubset(app.id, body.permission_denies)
  const existing = await repository.findAssignmentForUserApp(organizationId, membership.user_id, app.id)
  if (existing && existing.status === 'active' && existing.deletedAt === null && existing.revokedAt === null)
    throw appError('app-membership/duplicate')

  const now = BigInt(nowUnixSeconds())
  const assignment = existing
    ? await repository.reactivateAssignment(existing.id, {
        appRoleId: role.id,
        status: body.status,
        permissionGrants: grants,
        permissionDenies: denies,
        title: body.title ?? null,
        attributes: body.attributes ?? null,
        assignedBy: principal.userId,
        assignedAt: now,
        updatedAt: now,
      })
    : await repository.createAssignment({
        id: generateId('appAssignment'),
        organizationId,
        userId: membership.user_id,
        appId: app.id,
        appRoleId: role.id,
        status: body.status,
        permissionGrants: grants,
        permissionDenies: denies,
        title: body.title ?? null,
        attributes: body.attributes ?? null,
        assignedBy: principal.userId,
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
      })

  const catalog = await repository.listPermissions(app.id)
  return profileFromLoaded({ assignment, membership, app, entitlement, catalog })
}

export async function retrieveAppMembership(
  organizationId: string,
  assignmentId: string,
  principal: OrgAccessPrincipal
): Promise<AppMembership> {
  await requireOrgAppAccessRead(organizationId, principal)
  const assignment = await repository.findAssignment(organizationId, assignmentId)
  if (!assignment) throw appError('app-membership/not-found')
  const membership = await requireTargetMembership({ organizationId, userId: assignment.userId })
  const app = appOrNotFound(await findAppForAccessById(assignment.appId))
  const entitlement = await getOrgAppEntitlement(organizationId, app.id)
  const catalog = await repository.listPermissions(app.id)
  return profileFromLoaded({ assignment, membership, app, entitlement, catalog })
}

export async function updateAppMembership(
  organizationId: string,
  assignmentId: string,
  body: UpdateAppMembershipBody,
  principal: OrgAccessPrincipal
): Promise<AppMembership> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  const assignment = await repository.findAssignment(organizationId, assignmentId)
  if (!assignment) throw appError('app-membership/not-found')
  const app = appOrNotFound(await findAppForAccessById(assignment.appId))
  const entitlement = await requireEntitlement(organizationId, app.id)
  const membership = await requireTargetMembership({ organizationId, userId: assignment.userId })

  let nextRoleId = body.app_role_id
  if (typeof nextRoleId === 'string')
    await requireRole({ appId: app.id, organizationId, roleId: nextRoleId })
  await ensureNotLastAdmin(assignment, {
    ...(nextRoleId !== undefined ? { roleId: nextRoleId } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
  })

  const grants =
    body.permission_grants === undefined
      ? undefined
      : await validateCatalogSubset(app.id, body.permission_grants)
  const denies =
    body.permission_denies === undefined
      ? undefined
      : await validateCatalogSubset(app.id, body.permission_denies)
  const now = BigInt(nowUnixSeconds())
  const reactivating = body.status === 'active'
  const updated = await repository.updateAssignment(assignment.id, {
    ...(nextRoleId !== undefined ? { appRoleId: nextRoleId } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(grants !== undefined ? { permissionGrants: grants } : {}),
    ...(denies !== undefined ? { permissionDenies: denies } : {}),
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.attributes !== undefined ? { attributes: body.attributes } : {}),
    ...(reactivating
      ? {
          revokedAt: null,
          revokedBy: null,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        }
      : {}),
    updatedAt: now,
  })
  const catalog = await repository.listPermissions(app.id)
  return profileFromLoaded({ assignment: updated, membership, app, entitlement, catalog })
}

export async function deleteAppMembership(
  organizationId: string,
  assignmentId: string,
  principal: OrgAccessPrincipal
): Promise<{ object: 'app_membership'; id: string; deleted: true }> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  const assignment = await repository.findAssignment(organizationId, assignmentId)
  if (!assignment || assignment.deletedAt !== null) throw appError('app-membership/not-found')
  await ensureNotLastAdmin(assignment, { deleting: true })
  await repository.revokeAssignment(assignment.id, principal.userId, BigInt(nowUnixSeconds()))
  return { object: 'app_membership', id: assignment.id, deleted: true }
}

export async function listAppMembershipsForMember(
  organizationId: string,
  membershipId: string,
  principal: OrgAccessPrincipal
): Promise<ListObject<AppMembership>> {
  await requireOrgAppAccessRead(organizationId, principal)
  const membership = await findMembershipForAccessById(organizationId, membershipId)
  if (!membership) throw appError('app-membership/not-found')
  const target: AccessMembership = {
    id: membership.id,
    organization_id: membership.organization_id,
    user_id: membership.user_id,
    status: membership.status,
  }

  const entitlements = (await listOrgAppEntitlements(organizationId)).filter((entitlement) =>
    ENTITLED_STATUSES.has(entitlement.status)
  )
  const apps = (await listAppsForAccess(entitlements.map((entitlement) => entitlement.appId)))
    .filter((app) => app.slug !== ENTERPRISE_SLUG)
    .map((app) => ({ id: app.id, slug: app.slug, name: app.name }))
  const appIds = apps.map((app) => app.id)
  const assignments = await repository.listAssignmentsForUserApps(
    organizationId,
    target.user_id,
    appIds
  )
  const catalogs = await repository.listPermissionsForApps(appIds)
  const assignmentByApp = new Map(assignments.map((assignment) => [assignment.appId, assignment]))
  const entitlementByApp = new Map(entitlements.map((entitlement) => [entitlement.appId, entitlement]))
  const catalogByApp = new Map<string, AppPermissionRow[]>()
  for (const permission of catalogs) {
    const rows = catalogByApp.get(permission.appId) ?? []
    rows.push(permission)
    catalogByApp.set(permission.appId, rows)
  }

  const data = await Promise.all(
    apps.map((app) =>
      profileFromLoaded({
        assignment: assignmentByApp.get(app.id) ?? null,
        membership: target,
        app,
        entitlement: entitlementByApp.get(app.id) ?? null,
        catalog: catalogByApp.get(app.id) ?? [],
      })
    )
  )
  return listObject({
    data,
    hasMore: false,
    url: `/organizations/${organizationId}/members/${membershipId}/app-memberships`,
  })
}

export async function listMembersForApp(
  organizationId: string,
  appId: string,
  principal: OrgAccessPrincipal
): Promise<ListObject<AppMembership>> {
  await requireOrgAppAccessRead(organizationId, principal)
  const app = appOrNotFound(await findAppForAccessById(appId))
  ensureAssignableApp(app)
  const entitlement = await requireEntitlement(organizationId, app.id)
  const assignments = await repository.listAssignmentsForApp(organizationId, app.id)
  const memberships = await listMembershipsForAccess(
    organizationId,
    assignments.map((assignment) => assignment.userId)
  )
  const membershipByUser = new Map(memberships.map((membership) => [membership.user_id, membership]))
  const catalog = await repository.listPermissions(app.id)
  const data: AppMembership[] = []
  for (const assignment of assignments) {
    const membership = membershipByUser.get(assignment.userId)
    if (!membership) continue
    data.push(
      await profileFromLoaded({
        assignment,
        membership,
        app,
        entitlement,
        catalog,
      })
    )
  }
  return listObject({
    data,
    hasMore: false,
    url: `/organizations/${organizationId}/apps/${app.id}/members`,
  })
}

export async function retrieveMyAppMembership(
  organizationId: string,
  appId: string,
  principal: OrgAccessPrincipal
): Promise<AppMembership> {
  if (!principal.userId)
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    })
  await requireOrgAppAccessRead(organizationId, principal)
  const membership = await requireTargetMembership({
    organizationId,
    userId: principal.userId,
  })
  const app = appOrNotFound(await findAppForAccessById(appId))
  ensureAssignableApp(app)
  const entitlement = await getOrgAppEntitlement(organizationId, app.id)
  const assignment = await repository.findAssignmentForUserApp(
    organizationId,
    principal.userId,
    app.id
  )
  const catalog = await repository.listPermissions(app.id)
  return profileFromLoaded({ assignment, membership, app, entitlement, catalog })
}

export async function materializeRoleTemplatesForApp(params: {
  organizationId: string
  appId: string
}): Promise<{ seeded: number; skipped: number }> {
  const app = appOrNotFound(await findAppForAccessById(params.appId))
  if (app.slug === ENTERPRISE_SLUG) return { seeded: 0, skipped: 0 }
  const templates = await repository.listRoles(app.id, null)
  let seeded = 0
  let skipped = 0
  for (const template of templates) {
    if (await repository.findRoleByKey(app.id, params.organizationId, template.key)) {
      skipped += 1
      continue
    }
    const now = BigInt(nowUnixSeconds())
    await repository.createRole({
      id: generateId('role'),
      appId: app.id,
      organizationId: params.organizationId,
      key: template.key,
      name: template.name,
      description: template.description,
      permissions: [...template.permissions],
      isSystem: template.isSystem,
      isDefault: template.isDefault,
      templateKey: template.key,
      position: template.position,
      createdAt: now,
      updatedAt: now,
    })
    seeded += 1
  }
  return { seeded, skipped }
}

export { isEntitled }
