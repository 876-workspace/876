import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { EditCapacityData } from '@/features/reports/components/edit-capacity-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Edit capacity' }

type Props = { params: Promise<{ capacityId: string }> }

export default async function EditCapacityPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()
  const { capacityId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/capacity"
        label="Capacity"
        className="mb-4"
      />
      <ResourceToolbar title="Edit capacity" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <EditCapacityData orgId={orgId} capacityId={capacityId} />
      </Suspense>
    </div>
  )
}
