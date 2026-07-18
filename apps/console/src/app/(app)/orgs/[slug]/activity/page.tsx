import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ActivityView } from '@/components/detail/detail-views'
import { resolveOrg } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Activity' }
  return { title: `${org.name ?? org.slug} • Activity - Organizations` }
}

export default async function OrganizationActivityPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <ActivityView subjectType="organization" subjectId={org.id} />
}
