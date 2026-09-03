import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PROJECTS_SKELETON_COLUMNS } from '@/features/projects/components/projects-skeleton-columns'
import { ProjectsData } from '@/features/projects/components/projects-data'
import {
  isProjectStatus,
  PROJECT_STATUS_OPTIONS,
  type ProjectFilterStatus,
} from '@/features/projects/project-status'

import { resolveOrg } from '../../../../_data'
import { workspaceProjectsBase } from '../../_lib/base'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Projects' }

  return { title: `${org.name ?? org.slug} • Projects - Organizations` }
}

export default async function OrganizationProjectsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const { status } = await searchParams
  const selectedStatus: ProjectFilterStatus = isProjectStatus(status)
    ? status
    : 'all'

  return (
    <div>
      <ResourceToolbar
        title="Projects"
        titleFilter={
          <StatusFilterHeading
            label="Projects"
            value={selectedStatus}
            options={PROJECT_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/orgs/${slug}/workspace/projects/projects/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={PROJECTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <ProjectsData
          organizationId={org.id}
          base={workspaceProjectsBase(slug)}
          status={selectedStatus}
        />
      </Suspense>
    </div>
  )
}
