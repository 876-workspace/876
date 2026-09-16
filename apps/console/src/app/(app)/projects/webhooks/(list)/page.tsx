import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { WebhooksData } from '@/features/projects/components/webhooks-data'
import { WEBHOOK_ENDPOINTS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Webhooks' }

export default async function PlatformWebhooksPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Webhooks" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={WEBHOOK_ENDPOINTS_SKELETON_COLUMNS}
            rows={8}
          />
        }
      >
        <WebhooksData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
