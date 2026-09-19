import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ProjectTimeData } from '@/features/projects/components/project-time-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { OPERATOR_TIME_ENTRY_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { projects } from '@/lib/clients/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Time' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Time' }

  return { title: `${result.data.name} • Time - Organizations` }
}

export default async function OrganizationProjectTimePage({ params }: Props) {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Time" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={OPERATOR_TIME_ENTRY_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <ProjectTimeData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={projectId}
        />
      </Suspense>
    </>
  )
}
