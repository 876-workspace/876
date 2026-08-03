import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'

import { ActivityView } from '@/components/patterns/detail/detail-views'
import { resolveOrg } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Activity' }
  return { title: `${org.name ?? org.slug} • Activity - Organizations` }
}

export default function OrganizationActivityPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <OrganizationActivityData params={params} />
    </Suspense>
  )
}

async function OrganizationActivityData({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <ActivityView subjectType="organization" subjectId={org.id} />
    </Suspense>
  )
}
