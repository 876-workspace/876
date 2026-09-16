import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import {
  loadMyWork,
  MyWorkEvents,
  MyWorkIssues,
  MyWorkReminders,
  MyWorkSectionSkeleton,
} from '@/features/projects/components/my-work-sections'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'My Work' }

export default async function MyWorkPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId, userId } = await requireProjectsContext()
  const myWork = loadMyWork(orgId, userId)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar title="My Work" refresh />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="876-card space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Assigned work items</h2>
          <Suspense fallback={<MyWorkSectionSkeleton />}>
            <MyWorkIssues myWork={myWork} />
          </Suspense>
        </section>

        <section className="876-card space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Upcoming events</h2>
          <Suspense fallback={<MyWorkSectionSkeleton />}>
            <MyWorkEvents myWork={myWork} />
          </Suspense>
        </section>

        <section className="876-card space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Reminders due</h2>
          <Suspense fallback={<MyWorkSectionSkeleton />}>
            <MyWorkReminders myWork={myWork} />
          </Suspense>
        </section>
      </div>
    </div>
  )
}
