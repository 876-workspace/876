import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = { params: Promise<{ orgSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Customers' }

  return { title: `${org.name ?? org.slug} • CRM customers - Organizations` }
}

/** The persistent customers layout owns the toolbar and list column. */
export default function CrmWorkspaceCustomersPage() {
  return null
}
