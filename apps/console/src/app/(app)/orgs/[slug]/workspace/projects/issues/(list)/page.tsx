import type { Metadata } from 'next'

import { resolveOrg } from '../../../../_data'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Issues' }

  return { title: `${org.name ?? org.slug} • Issues - Organizations` }
}

export default function OrganizationIssuesPage() {
  return null
}
