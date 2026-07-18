import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import {
  requireEnterpriseFeature,
  requireOrgMembership,
  requireSession,
} from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Members | 876',
  robots: { index: false, follow: false },
}

export default async function OrganizationMembersLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/members`)
  const { membership } = await requireOrgMembership(sessionUser.id, slug)
  await requireEnterpriseFeature(
    'enterprise_members',
    membership.organization.id
  )

  return children
}
