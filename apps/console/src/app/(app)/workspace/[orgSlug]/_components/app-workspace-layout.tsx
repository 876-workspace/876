import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'

import { findAppWorkspace } from '@/features/orgs/app-workspaces'
import { WorkspaceEntitlementNotice } from '@/features/orgs/components/workspace-entitlement-notice'
import {
  resolveOrg,
  resolveOrgEntitledAppSlugs,
} from '@/features/orgs/org-data'
import { WorkspaceHeader } from './workspace-header'

/**
 * The frame every page inside one app's workspace renders in.
 *
 * There is deliberately no rail here. A workspace is a top-level Console
 * context, so the *main* sidebar swaps to that product's navigation — see
 * `app/(app)/@sidebar/workspace/[orgSlug]/[[...section]]`. A second rail inside
 * the page would mean two renderings of the same navigation, free to drift.
 *
 * Own the page gutter here so workspace headers, notices, and nested routes
 * align. Child routes must not add another padded Page wrapper.
 */
export function createWorkspaceLayout(workspaceKey: string) {
  return async function AppWorkspaceLayoutShell({
    children,
    params,
  }: {
    children: ReactNode
    params: Promise<{ orgSlug: string }>
  }) {
    const { orgSlug } = await params
    const workspace = findAppWorkspace(workspaceKey)
    if (!workspace) notFound()

    return (
      <Page className="space-y-6">
        <WorkspaceHeader orgSlug={orgSlug} workspaceKey={workspaceKey} />
        <Suspense fallback={null}>
          <EntitlementNotice
            orgSlug={orgSlug}
            appSlug={workspace.appSlug}
            appLabel={workspace.label}
          />
        </Suspense>
        {children}
      </Page>
    )
  }
}

async function EntitlementNotice({
  orgSlug,
  appSlug,
  appLabel,
}: {
  orgSlug: string
  appSlug: string
  appLabel: string
}) {
  const org = await resolveOrg(orgSlug)
  if (!org) return null

  const entitled = await resolveOrgEntitledAppSlugs(org.id)
  if (entitled.error)
    return (
      <AppError
        title="Workspace entitlement could not be verified"
        error={entitled.error}
        variant="inline"
        showCode
      />
    )
  if (entitled.data.includes(appSlug)) return null

  return (
    <WorkspaceEntitlementNotice
      appLabel={appLabel}
      subscriptionsHref={`/orgs/${orgSlug}/subscriptions`}
    />
  )
}
