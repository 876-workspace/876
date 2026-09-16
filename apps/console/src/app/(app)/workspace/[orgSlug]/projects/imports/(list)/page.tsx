import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { ImportsData } from '@/features/projects/components/imports-data'
import { IMPORT_JOBS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Imports' }

  return { title: `${org.name ?? org.slug} • Imports - Organizations` }
}

export default async function OrganizationImportsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Imports" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={IMPORT_JOBS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <ImportsData organizationId={org.id} base={projectsBase(orgSlug)} />
      </Suspense>
    </div>
  )
}
