import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { TaskListsData } from '@/features/projects/components/task-lists-data'
import { TASK_LISTS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ project?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Task Lists' }

  return { title: `${org.name ?? org.slug} • Task Lists - Organizations` }
}

export default async function OrganizationTaskListsPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const { project } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Task Lists" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TASK_LISTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <TaskListsData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={project?.trim() || undefined}
        />
      </Suspense>
    </div>
  )
}
