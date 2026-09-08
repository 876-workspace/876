import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { resolveNavigation } from '@876/core/access'
import { resolveAccessibleWidgetIds } from '@876/widgets'
import { AppError } from '@876/ui/app-error'
import { redirect } from 'next/navigation'

import { InvoiceShell } from '@/components/shell/shell'
import { navConfig } from '@/components/shell/nav-config'
import { resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireValidSession } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getFeatures } from '@/lib/features'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireValidSession('/')

  const result = await getInvoiceContextResult()

  if (result.status === 'signed-out')
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=%2F`)
  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status === 'unavailable') redirect('/unavailable')

  const context = result.context
  if (context.accessStatus !== 'active' && context.accessStatus !== 'trialing')
    redirect('/onboarding')

  const [access, session, features] = await Promise.all([
    resolveAccessContext(context.userId, context.orgId),
    getAuthSession(),
    getFeatures({
      userId: context.userId,
      organizationId: context.orgId,
    }),
  ])
  if (access.status === 'ok' && access.context.permissions.length === 0)
    redirect('/no-access')

  const effectivePermissions = new Set(
    access.status === 'ok' ? access.context.permissions : []
  )
  const shellFeatures = {
    ...features,
    widgets: {
      enabledWidgetIds: resolveAccessibleWidgetIds(
        'invoice',
        features.widgets.enabledWidgetIds,
        effectivePermissions
      ),
    },
  }

  const user = isSignedSession(session) ? session.user : null
  const email = user?.email ?? ''
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    email ||
    'User'

  const orgs = context.organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug ?? org.id,
  }))
  const currentOrg = orgs.find((org) => org.id === context.orgId) ??
    orgs[0] ?? {
      id: context.orgId,
      name: context.orgName,
      slug: context.orgSlug ?? context.orgId,
    }

  return (
    <InvoiceShell
      orgName={context.orgName}
      user={{
        name: displayName,
        email,
        avatar: user?.avatar ?? null,
      }}
      currentOrg={currentOrg}
      orgs={orgs}
      features={shellFeatures}
      navigation={
        access.status === 'ok'
          ? resolveNavigation(navConfig, access.context)
          : []
      }
    >
      {access.status === 'unavailable' ? (
        <AppError
          title="Access could not be verified"
          error={{
            code: access.code,
            message:
              'App access is temporarily unavailable. Try again shortly.',
          }}
          variant="banner"
        />
      ) : (
        children
      )}
    </InvoiceShell>
  )
}
