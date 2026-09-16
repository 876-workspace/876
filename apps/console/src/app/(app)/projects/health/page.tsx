import { Suspense } from 'react'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { HealthData } from '@/features/projects/components/health-data'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Health' }

export default async function PlatformHealthPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Health" refresh />
      <Suspense fallback={<HealthFallback />}>
        <HealthData organizationId={org.id} />
      </Suspense>
    </Page>
  )
}

function HealthFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
