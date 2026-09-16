import { Suspense } from 'react'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { ActivityData } from '@/features/projects/components/activity-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Activity' }

export default async function PlatformActivityPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Activity" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ActivityData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
