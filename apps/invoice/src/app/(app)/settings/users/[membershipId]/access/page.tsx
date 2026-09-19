import type { Metadata } from 'next'

import { AppError } from '@876/ui/app-error'
import { buildAccessEntries } from '@876/access-ui/entries'
import { getInvoiceContext } from '@/lib/auth/context'
import { resolveInvoiceAccessViewer } from '@/lib/auth/app-access'
import { getWorkspace } from '@/lib/clients/workspace'
import type { AppMembership } from '@876/access-ui/member-types'
import { loadMemberAppMemberships } from '../../_data'
import { MemberAccessPanel } from '../_components/member-access-panel'

export const metadata: Metadata = {
  title: 'App Access',
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
  // Derived from loadRoles rather than restated, so the empty fallback cannot
  // drift from the shape the workspace client actually returns.
  const rolesPromise: Promise<Awaited<ReturnType<typeof loadRoles>>> =
    membershipsPromise.then(async (result) =>
      result.error
        ? { rolesByApp: new Map(), errors: [] }
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