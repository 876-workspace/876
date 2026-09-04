import type { Metadata } from 'next'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Projects' }

  return { title: `${org.name ?? org.slug} • Projects - Organizations` }
}

export default function OrganizationProjectsPage() {
  return null
}
