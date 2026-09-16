import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { TaskListsData } from '@/features/projects/components/task-lists-data'
import { TASK_LISTS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Task Lists' }

export default async function PlatformTaskListsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const org = await getPlatformOrganization()
  const { project } = await searchParams
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Task Lists" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TASK_LISTS_SKELETON_COLUMNS} rows={8} />
        }
      >
        <TaskListsData
          organizationId={org.id}
          base={projectsBase(null)}
          projectId={project?.trim() || undefined}
        />
      </Suspense>
    </Page>
  )
}
