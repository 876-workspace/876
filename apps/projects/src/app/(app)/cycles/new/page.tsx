import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { NewCycleData } from '@/features/projects/components/new-cycle-data'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New cycle' }

export default async function NewCyclePage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/cycles" label="Cycles" className="mb-4" />
      <ResourceToolbar title="New cycle" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <NewCycleData />
      </Suspense>
    </div>
  )
}
