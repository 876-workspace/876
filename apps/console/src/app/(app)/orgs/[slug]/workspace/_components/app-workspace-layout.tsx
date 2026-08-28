import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Skeleton } from '@876/ui/skeleton'
import { OrgAvatar as AppLogo } from '@876/ui/org-avatar'

import {
  findAppWorkspace,
  type WorkspaceIconKey,
} from '@/features/orgs/app-workspaces'
import { WorkspaceEntitlementNotice } from '@/features/orgs/components/workspace-entitlement-notice'
import { WorkspaceIcon } from '@/features/orgs/components/workspace-icon'
import { WorkspaceShell } from '@/features/orgs/components/workspace-shell'
import { resolveApp } from '@/app/(app)/apps/[slug]/_data'
import { resolveOrg, resolveOrgEntitledAppSlugs } from '../../_data'

export function createWorkspaceLayout(workspaceKey: string) {
  return async function AppWorkspaceLayoutShell({
    children,
    params,
  }: {
    children: ReactNode
    params: Promise<{ slug: string }>
  }) {
    const { slug } = await params
    const workspace = findAppWorkspace(workspaceKey)
    if (!workspace) notFound()

    return (
      <WorkspaceShell
        workspace={workspace}
        orgSlug={slug}
        appLogo={
          <Suspense
            fallback={
              <span className="bg-muted text-muted-foreground border-border/50 flex size-5.5 shrink-0 items-center justify-center rounded-md border">
                <WorkspaceIcon
                  iconKey={workspace.iconKey}
                  className="size-3.5"
                />
              </span>
            }
          >
            <AppLogoNode
              appSlug={workspace.appSlug}
              fallbackIconKey={workspace.iconKey}
            />
          </Suspense>
        }
        orgName={
          <Suspense
            fallback={
              <Skeleton className="inline-block h-3.5 w-24 align-middle" />
            }
          >
            <OrgName slug={slug} />
          </Suspense>
        }
        notice={
          <Suspense fallback={null}>
            <EntitlementNotice
              slug={slug}
              appSlug={workspace.appSlug}
              appLabel={workspace.label}
            />
          </Suspense>
        }
      >
        {children}
      </WorkspaceShell>
    )
  }
}

async function AppLogoNode({
  appSlug,
  fallbackIconKey,
}: {
  appSlug: string
  fallbackIconKey: WorkspaceIconKey
}) {
  const app = await resolveApp(appSlug)
  if (app?.logo_url) {
    return (
      <AppLogo
        name={app.name}
        src={app.logo_url}
        size="sm"
        className="size-5.5 shrink-0 rounded-md object-cover"
      />
    )
  }

  return (
    <span className="bg-muted text-muted-foreground border-border/50 flex size-5.5 shrink-0 items-center justify-center rounded-md border">
      <WorkspaceIcon iconKey={fallbackIconKey} className="size-3.5" />
    </span>
  )
}

async function OrgName({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  return <>{org?.name ?? slug}</>
}

async function EntitlementNotice({
  slug,
  appSlug,
  appLabel,
}: {
  slug: string
  appSlug: string
  appLabel: string
}) {
  const org = await resolveOrg(slug)
  if (!org) return null

  const entitled = await resolveOrgEntitledAppSlugs(org.id)
  if (entitled.includes(appSlug)) return null

  return (
    <WorkspaceEntitlementNotice
      appLabel={appLabel}
      subscriptionsHref={`/orgs/${slug}/subscriptions`}
    />
  )
}
