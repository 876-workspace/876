import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { getManageContext } from '@/lib/auth/manage-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { CouriersShell } from '@/components/couriers-shell'
import { getAppsDirectory } from '@/lib/apps-directory'
import { getFeatures } from '@/lib/features'

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    const loginParams = new URLSearchParams({
      [AUTH_RETURN_TO_PARAM]: `/org/${orgSlug}`,
    })
    redirect(`/login?${loginParams.toString()}`)
  }

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

  const basePath = `/org/${orgSlug}`
  const tenantName = ctx.tenant?.name ?? ctx.orgName ?? '876 Couriers'
  const currentOrg = {
    id: ctx.orgId,
    name: ctx.orgName,
    slug: ctx.orgSlug!,
    role: ctx.role,
  }
  const apps = getAppsDirectory(basePath)
  const user = {
    name:
      [session.user.firstName, session.user.lastName]
        .filter(Boolean)
        .join(' ') || session.user.email,
    email: session.user.email,
    avatar: session.user.avatar ?? null,
  }

  return (
    <CouriersShell
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
    </CouriersShell>
  )
}
