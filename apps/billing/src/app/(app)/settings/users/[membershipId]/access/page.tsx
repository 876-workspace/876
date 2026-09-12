import type { Metadata } from 'next'

import { AppError } from '@876/ui/app-error'
import { buildAccessEntries } from '@876/access-ui/entries'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getBillingWorkspace } from '@/lib/auth/app-access'
import { loadMemberAppMemberships } from '../../_data'
import { MemberAccessPanel } from '../_components/member-access-panel'
import type { AppMembership, AppRole } from '@876/access-ui/member-types'

export const metadata: Metadata = {
  title: 'App Access',
}

async function loadRoles(orgId: string, memberships: AppMembership[]) {
  const workspace = await getBillingWorkspace()
  if (!workspace)
    return {
      rolesByApp: new Map<string, AppRole[]>(),
      errors: [] as {
        appId: string
        appName: string
        error: { code: string; message: string }
      }[],
    }
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
  const context = await getWorkspaceContext()
  if (!context)
    return (
      <AppError
        title="App access could not be loaded"
        error={{
          code: 'billing/unavailable',
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
      ? {
          rolesByApp: new Map<string, AppRole[]>(),
          errors: [] as {
            appId: string
            appName: string
            error: { code: string; message: string }
          }[],
        }
      : loadRoles(context.orgId, result.memberships)
  )
  const [membershipsResult, rolesResult] = await Promise.all([
    membershipsPromise,
    rolesPromise,
  ])
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
        readOnly={!context.permissions.includes('members:write')}
      />
    </div>
  )
}