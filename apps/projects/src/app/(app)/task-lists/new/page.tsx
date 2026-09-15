import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { NewTaskListData } from '@/features/projects/components/new-task-list-data'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New task list' }

type Props = { searchParams: Promise<{ project?: string }> }

export default async function NewTaskListPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { project } = await searchParams

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ResourceToolbar title="New task list" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <NewTaskListData projectId={project} />
      </Suspense>
    </div>
  )
}
