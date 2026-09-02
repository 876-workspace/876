import { AppError } from '@876/ui/app-error'
import type {
  AccessAppEntry,
  AccessAppRole,
  AccessPermission,
} from '@876/access-ui/types'
import { appPermissionCatalogs } from '@876/core/access/catalogs'
import { getInvoiceContext } from '@/lib/auth/context'
import { resolveInvoiceAccessViewer } from '@/lib/auth/app-access'
import { getWorkspace } from '@/lib/services/workspace'
import type { AppMembership, AppRole } from '../../_lib/types'
import { loadMemberAppMemberships } from '../../_data'
import { MemberAccessPanel } from '../_components/member-access-panel'

function roleForAccess(role: AppRole): AccessAppRole {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.is_system,
    isDefault: role.is_default,
  }
}
function catalogForAccess(appSlug: string): AccessPermission[] {
  const catalog = appPermissionCatalogs[appSlug]
  if (!catalog) return []
  const labels = new Map(
    catalog.modules.map((module) => [module.key, module.label])
  )
  return catalog.permissions.map((permission) => ({
    key: permission.key,
    moduleKey: permission.moduleKey,
    moduleLabel: labels.get(permission.moduleKey) ?? '',
    action: permission.action,
    label: permission.label,
    isDangerous: permission.isDangerous ?? false,
  }))
}
function buildAccessEntries(
  memberships: AppMembership[],
  rolesByApp: ReadonlyMap<string, AppRole[]>
): AccessAppEntry[] {
  return memberships.map((membership) => ({
    assignmentId: membership.assigned ? membership.id : null,
    appId: membership.app_id,
    appSlug: membership.app_slug,
    appName: membership.app_name,
    entitled: membership.entitled,
    assigned: membership.assigned,
    status: membership.status,
    role: membership.app_role ? roleForAccess(membership.app_role) : null,
    roles: (rolesByApp.get(membership.app_id) ?? []).map(roleForAccess),
    grants: membership.permission_grants,
    denies: membership.permission_denies,
    effectivePermissions: membership.effective_permissions,
    catalog: catalogForAccess(membership.app_slug),
  }))
}
async function loadRoles(orgId: string, memberships: AppMembership[]) {
  const workspace = await getWorkspace()
  const apps = new Map(
    memberships
      .filter((membership) => membership.entitled)
      .map((membership) => [membership.app_id, membership.app_name])
  )
  const results = await Promise.all(
    [...apps].map(async ([appId, appName]) => ({
      appId,
      appName,
      result: await workspace.orgAppRoles.list(orgId, appId),
    }))
  )
  return {
    rolesByApp: new Map(
      results.map(({ appId, result }) => [appId, result.data?.data ?? []])
    ),
    errors: results.flatMap(({ appId, appName, result }) =>
      result.error ? [{ appId, appName, error: result.error }] : []
    ),
  }
}
export default async function MemberAccessPage({
  params,
}: {
  params: Promise<{ membershipId: string }>
}) {
  const { membershipId } = await params
  const context = await getInvoiceContext()
  if (!context)
    return (
      <AppError
        title="App access could not be loaded"
        error={{
          code: 'invoice/unavailable',
          message: 'Organization context is unavailable.',
        }}
        variant="section"
      />
    )
  const membershipsPromise = loadMemberAppMemberships(
    context.orgId,
    membershipId
  )
  const rolesPromise = membershipsPromise.then((result) =>
    result.error
      ? Promise.resolve({
          rolesByApp: new Map<string, AppRole[]>(),
          errors: [],
        })
      : loadRoles(context.orgId, result.memberships)
  )
  const [accessOutcome, membershipsResult, rolesResult] = await Promise.all([
    resolveInvoiceAccessViewer(context.orgId),
    membershipsPromise,
    rolesPromise,
  ])

  // A resolution outage is not permission. Read-only is the fail-closed answer
  // for both a denial and an unavailable check.
  const canManage =
    accessOutcome.status === 'ok' && accessOutcome.viewer.canManageAppAccess
  if (membershipsResult.error)
    return (
      <AppError
        title="App access could not be loaded"
        error={membershipsResult.error}
        variant="section"
      />
    )
  return (
    <div className="space-y-4">
      {rolesResult.errors.map(({ appId, appName, error }) => (
        <AppError
          key={appId}
          title={`${appName} roles could not be loaded`}
          error={error}
          variant="banner"
        />
      ))}
      <MemberAccessPanel
        entries={buildAccessEntries(
          membershipsResult.memberships,
          rolesResult.rolesByApp
        )}
        membershipId={membershipId}
        readOnly={!canManage}
      />
    </div>
  )
}
