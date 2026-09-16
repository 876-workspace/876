import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { resolveOrg } from '@/features/orgs/org-data'
import { HealthData } from '@/features/projects/components/health-data'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Health' }

  return { title: `${org.name ?? org.slug} • Health - Organizations` }
}

export default async function OrganizationHealthPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Health" refresh />
      <Suspense fallback={<HealthFallback />}>
        <HealthData organizationId={org.id} />
      </Suspense>
    </div>
  )
}

function HealthFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
