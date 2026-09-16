import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PROJECT_FIELDS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { ProjectFieldsData } from '@/features/projects/components/project-fields-data'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Project Fields' }

  return { title: `${org.name ?? org.slug} • Project Fields - Organizations` }
}

export default async function OrganizationProjectFieldsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Project Fields" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={PROJECT_FIELDS_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <ProjectFieldsData organizationId={org.id} />
      </Suspense>
    </div>
  )
}
