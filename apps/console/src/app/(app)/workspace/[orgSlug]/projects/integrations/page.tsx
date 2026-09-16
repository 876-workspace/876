import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { IntegrationsData } from '@/features/projects/components/integrations-data'
import { INTEGRATIONS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Integrations' }

  return { title: `${org.name ?? org.slug} • Integrations - Organizations` }
}

export default async function OrganizationIntegrationsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Integrations" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={INTEGRATIONS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <IntegrationsData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
        />
      </Suspense>
    </div>
  )
}
