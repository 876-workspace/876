import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { PHASES_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { PhasesData } from '@/features/projects/components/phases-data'
import {
  isPhaseStatus,
  PHASE_STATUS_OPTIONS,
} from '@/features/projects/phase-status'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Phases' }

  return { title: `${org.name ?? org.slug} • Phases - Organizations` }
}

export default async function OrganizationPhasesPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar
        title="Phases"
        titleFilter={
          <StatusFilterHeading
            label="Phases"
            value={isPhaseStatus(status) ? status : 'all'}
            options={PHASE_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={PHASES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <PhasesData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          status={isPhaseStatus(status) ? status : undefined}
        />
      </Suspense>
    </div>
  )
}
