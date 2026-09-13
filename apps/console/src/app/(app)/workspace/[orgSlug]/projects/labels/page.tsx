import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { LABELS_SKELETON_COLUMNS } from '@/features/projects/components/labels-skeleton-columns'
import { LabelsData } from '@/features/projects/components/labels-data'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Labels' }

  return { title: `${org.name ?? org.slug} • Labels - Organizations` }
}

export default async function OrganizationLabelsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar
        title="Labels"
        titleFilter={
          <StatusFilterHeading
            label="Labels"
            value="all"
            options={[{ value: 'all', label: 'All Labels' }]}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={LABELS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <LabelsData organizationId={org.id} />
      </Suspense>
    </div>
  )
}
