import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { notFound } from 'next/navigation'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { ProjectsData } from '@/features/projects/components/projects-data'
import { PROJECTS_SKELETON_COLUMNS } from '@/features/projects/components/projects-skeleton-columns'
import { isProjectStatus } from '@/features/projects/project-status'
import { resolveOrg } from '@/features/orgs/org-data'

import { ProjectsSection } from '../_components/projects-section'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Projects' }

  return { title: `${org.name ?? org.slug} • Projects - Organizations` }
}

export default async function OrganizationProjectsPage({
  params,
  searchParams,
}: Props & { searchParams: Promise<{ status?: string }> }) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <ProjectsSection orgSlug={orgSlug}>
      <Suspense
        fallback={
          <DataTableSkeleton columns={PROJECTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <ProjectsData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          status={isProjectStatus(status) ? status : undefined}
        />
      </Suspense>
    </ProjectsSection>
  )
}
