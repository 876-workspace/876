import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { NewRateData } from '@/features/finance/components/new-rate-data'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New rate' }

type Props = { params: Promise<{ projectId: string }> }

export default async function NewRatePage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { projectId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}/finance`}
        label="Finance"
        className="mb-4"
      />
      <ResourceToolbar title="New rate" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <NewRateData projectId={projectId} />
      </Suspense>
    </div>
  )
}
