import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { resolveOrg } from '@/features/orgs/org-data'
import { WorkflowsData } from '@/features/projects/components/workflows-data'
import { WORKFLOWS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Workflows' }

  return { title: `${org.name ?? org.slug} • Workflows - Organizations` }
}

export default async function OrganizationWorkflowsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Workflows" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={WORKFLOWS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <WorkflowsData organizationId={org.id} />
      </Suspense>
    </div>
  )
}
