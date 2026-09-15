import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { NewPhaseData } from '@/features/projects/components/new-phase-data'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New phase' }

export default async function NewPhasePage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.create' })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/phases" label="Phases" className="mb-4" />
      <ResourceToolbar title="New phase" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <NewPhaseData />
      </Suspense>
    </div>
  )
}
