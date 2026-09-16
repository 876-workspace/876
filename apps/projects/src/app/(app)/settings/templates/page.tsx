import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { TemplatesData } from '@/features/templates/components/templates-data'
import { TEMPLATE_SKELETON_COLUMNS } from '@/features/templates/components/template-skeleton-columns'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Templates' }

export default async function TemplatesSettingsPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar title="Templates" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TEMPLATE_SKELETON_COLUMNS} rows={5} />
        }
      >
        <TemplatesData orgId={orgId} />
      </Suspense>
    </div>
  )
}
