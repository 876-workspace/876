import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'

import { ProjectTimeData } from '@/features/projects/components/project-time-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { OPERATOR_TIME_ENTRY_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Time' }

  return { title: `${result.data.name} • Time - Projects` }
}

export default async function PlatformProjectTimePage({ params }: Props) {
  const { projectId } = await params
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Time" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={OPERATOR_TIME_ENTRY_SKELETON_COLUMNS}
            rows={8}
          />
        }
      >
        <ProjectTimeSection projectId={projectId} />
      </Suspense>
    </Page>
  )
}

async function ProjectTimeSection({ projectId }: { projectId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectTimeData
      organizationId={organizationId}
      base={projectsBase(null)}
      projectId={projectId}
    />
  )
}
