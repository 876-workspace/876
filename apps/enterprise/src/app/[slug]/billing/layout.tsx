import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import {
  requireEnterpriseFeature,
  requireOrgPermission,
  requireSession,
} from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Billing | 876',
  robots: { index: false, follow: false },
}

export default async function OrganizationBillingLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // Billing (payment details, bank accounts) is owner/billing-manager
  // territory — members without `billing:read` never see it.
  const sessionUser = await requireSession(`/${slug}/billing`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'billing:read'
  )
  await requireEnterpriseFeature(
    'enterprise_billing',
    membership.organization.id
  )

  return children
}
