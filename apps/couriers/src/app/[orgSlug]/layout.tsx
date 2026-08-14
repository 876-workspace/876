import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getManageContext } from '@/lib/auth/manage-context'
import { requireValidSession } from '@/lib/auth/guards'
import { Shell } from '@/components/shell/shell'
import { getAppsDirectory } from '@/lib/apps-directory'
import { getFeatures } from '@/lib/features'
import { isReservedOrgSlug } from '@/lib/reserved-slugs'

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  if (isReservedOrgSlug(orgSlug)) notFound()

  // Validates the account against the identity API, not just the sealed cookie:
  // a deleted or disabled account is signed out to /login rather than walked
  // into the membership flow that would otherwise strand it on /no-access.
  const sessionUser = await requireValidSession(`/${orgSlug}`)

  const ctx = await getManageContext(orgSlug)
  if (!ctx) redirect('/')

  if (ctx.accessStatus !== 'active') {
    const canActivate = ctx.role === 'owner' || ctx.role === 'admin'
    redirect(canActivate ? '/onboarding' : '/no-access')
  }

  if (ctx.role === 'member') redirect('/no-access')

  const features = await getFeatures({
    userId: ctx.userId,
    organizationId: ctx.orgId,
  })

  const basePath = `/${orgSlug}`
  // Management shell shows the live identity org name (the source of truth the
  // org profile edits), so a rename propagates everywhere. `Tenant.name` is the
  // couriers-local portal brand, not the management display name.
  const tenantName = ctx.orgName ?? ctx.tenant?.name ?? '876 Couriers'
  const currentOrg = {
    id: ctx.orgId,
    name: ctx.orgName,
    slug: ctx.orgSlug!,
    role: ctx.role,
    logoUrl: ctx.orgLogoUrl,
    planName: ctx.currentPlanName,
  }
  const apps = getAppsDirectory(basePath)
  const user = {
    name:
      [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(' ') ||
      sessionUser.email,
    email: sessionUser.email,
    avatar: sessionUser.avatar ?? null,
  }

  return (
    <Shell
      basePath={basePath}
      tenantName={tenantName}
      user={user}
      uiFeatures={features.uiFeatures}
      currentOrg={currentOrg}
      orgs={ctx.organizations}
      apps={apps}
      enabledWidgetIds={features.enabledWidgetIds}
    >
      {children}
    </Shell>
  )
}
