import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { EditRateData } from '@/features/finance/components/edit-rate-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Edit rate' }

type Props = { params: Promise<{ projectId: string; rateId: string }> }

export default async function EditRatePage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()
  const { projectId, rateId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}/finance`}
        label="Finance"
        className="mb-4"
      />
      <ResourceToolbar title="Edit rate" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <EditRateData orgId={orgId} projectId={projectId} rateId={rateId} />
      </Suspense>
    </div>
  )
}
