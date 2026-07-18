import type { ReactNode } from 'react'

import { EnterpriseShell } from '@/components/enterprise/enterprise-shell'
import { AnalyticsIdentity } from '@/lib/analytics/provider'
import {
  getEnabledEnterpriseFeatureSlugs,
  requireOrgMembership,
  requireSession,
} from '@/lib/auth/guards'

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}`)
  const { membership, user } = await requireOrgMembership(sessionUser.id, slug)
  const enabledFeatureSlugs = await getEnabledEnterpriseFeatureSlugs(
    membership.organization.id
  )

  return (
    <>
      <AnalyticsIdentity
        user={{
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        }}
        groups={[
          {
            type: 'organization',
            key: membership.organization.id,
            properties: {
              name: membership.organization.name,
              slug: membership.organization.slug,
              app_name: 'enterprise',
            },
          },
        ]}
      />
      <EnterpriseShell
        organization={membership.organization}
        enabledFeatureSlugs={[...enabledFeatureSlugs]}
        permissions={membership.permissions}
        orgId={membership.organization.id}
        user={{
          name: getDisplayName(user),
          email: user.email,
          avatar: user.avatar,
        }}
      >
        {children}
      </EnterpriseShell>
    </>
  )
}

function getDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  email: string
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return name || user.email
}
