import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { NewEventData } from '@/features/projects/components/event-form-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New event' }

export default async function NewEventPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/calendar" label="Calendar" className="mb-4" />
      <h1 className="876-page-title mb-5">New event</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <NewEventData orgId={orgId} />
      </Suspense>
    </div>
  )
}
