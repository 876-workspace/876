import { AppError } from '@876/ui/app-error'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { resolveCrmAccessViewer } from '@/lib/auth/app-access'
import { getWorkspace } from '@/lib/services/workspace'

import { buildAccessEntries } from '@876/access-ui/entries'
import type { AppMembership, AppRole } from '@/types/users'
import { loadMemberAppMemberships } from '../../_data'
import { MemberAccessPanel } from '../_components/member-access-panel'

export default async function MemberAccessPage({
  params,
}: {
  params: Promise<{ membershipId: string }>
}) {
  const { membershipId } = await params
  const context = await requireProjectsContext()
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
    resolveCrmAccessViewer(context.orgId),
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
