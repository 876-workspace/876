import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LABELS_SKELETON_COLUMNS } from '@/features/projects/components/labels-skeleton-columns'
import { LabelsData } from '@/features/projects/components/labels-data'

import { resolveOrg } from '../../../_data'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Labels' }

  return { title: `${org.name ?? org.slug} • Labels - Organizations` }
}

export default async function OrganizationLabelsPage({ params }: Props) {
  const { slug } = await params

  return (
    <div>
      <ResourceToolbar title="Labels" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={LABELS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <LabelsData slug={slug} />
      </Suspense>
    </div>
  )
}
