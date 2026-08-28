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

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

const WORKSPACE_KEY = 'crm'

/**
 * The CRM workspace shell.
 *
 * It awaits `params` and nothing else. A layout renders outside its own
 * `loading.tsx`, so an await here would suspend into the organization segment's
 * boundary and tear down the page the operator navigated from
 * (`.claude/rules/navigation-performance.md` Rule 2). The frame and the rail
 * come from the registry, which is static data, so both render on the first
 * paint; the organization name and the entitlement notice stream into their own
 * boundaries.
 */
export default async function CrmWorkspaceLayout({ children, params }: Props) {
  const { slug } = await params
  const workspace = findAppWorkspace(WORKSPACE_KEY)
  if (!workspace) notFound()

  return (
    <WorkspaceShell
      workspace={workspace}
      orgSlug={slug}
      appLogo={
        <Suspense
          fallback={
            <span className="bg-muted text-muted-foreground border-border/50 flex size-5.5 shrink-0 items-center justify-center rounded-md border">
              <WorkspaceIcon iconKey={workspace.iconKey} className="size-3.5" />
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
          <EntitlementNotice slug={slug} appSlug={workspace.appSlug} />
        </Suspense>
      }
    >
      {children}
    </WorkspaceShell>
  )
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

/**
 * Renders nothing in the ordinary case, which is why its fallback is `null`.
 *
 * The notice is not a guard. Entitlement decides what the workspace index
 * offers, so an operator only lands here without one by following an old link —
 * usually because the entitlement is the thing that went wrong.
 */
async function EntitlementNotice({
  slug,
  appSlug,
}: {
  slug: string
  appSlug: string
}) {
  const org = await resolveOrg(slug)
  if (!org) return null

  const entitled = await resolveOrgEntitledAppSlugs(org.id)
  if (entitled.includes(appSlug)) return null

  return (
    <WorkspaceEntitlementNotice
      appLabel="CRM"
      subscriptionsHref={`/orgs/${slug}/subscriptions`}
    />
  )
}
