import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { resolveOrg } from '@/features/orgs/org-data'
import { ImportDetailData } from '@/features/projects/components/import-detail-data'

type Props = {
  params: Promise<{ orgSlug: string; jobId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Import job' }

  return { title: `${org.name ?? org.slug} • Import job - Organizations` }
}

export default async function OrganizationImportDetailPage({ params }: Props) {
  const { orgSlug, jobId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<ImportDetailFallback />}>
      <ImportDetailData organizationId={org.id} jobId={jobId} />
    </Suspense>
  )
}

function ImportDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
