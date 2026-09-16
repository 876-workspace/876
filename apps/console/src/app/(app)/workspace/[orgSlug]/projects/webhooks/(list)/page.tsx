import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { WebhooksData } from '@/features/projects/components/webhooks-data'
import { WEBHOOK_ENDPOINTS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Webhooks' }

  return { title: `${org.name ?? org.slug} • Webhooks - Organizations` }
}

export default async function OrganizationWebhooksPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Webhooks" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={WEBHOOK_ENDPOINTS_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <WebhooksData organizationId={org.id} base={projectsBase(orgSlug)} />
      </Suspense>
    </div>
  )
}
