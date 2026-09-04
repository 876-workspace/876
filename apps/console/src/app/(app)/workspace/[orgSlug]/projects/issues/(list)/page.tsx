import type { Metadata } from 'next'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Issues' }

  return { title: `${org.name ?? org.slug} • Issues - Organizations` }
}

export default function OrganizationIssuesPage() {
  return null
}
