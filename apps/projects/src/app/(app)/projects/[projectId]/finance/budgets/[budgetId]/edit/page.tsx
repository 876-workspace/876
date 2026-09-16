import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { EditBudgetData } from '@/features/finance/components/edit-budget-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Edit budget' }

type Props = { params: Promise<{ projectId: string; budgetId: string }> }

export default async function EditBudgetPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()
  const { projectId, budgetId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}/finance`}
        label="Finance"
        className="mb-4"
      />
      <ResourceToolbar title="Edit budget" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <EditBudgetData orgId={orgId} projectId={projectId} budgetId={budgetId} />
      </Suspense>
    </div>
  )
}
