import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { Suspense } from 'react'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { OverviewData } from '@/features/projects/components/overview-data'
import { getPlatformOrganization } from '@/lib/platform-org'

import { projectsBase } from '@/features/orgs/app-workspaces'

export const metadata = { title: 'Projects' }

export default function ProjectsOverviewPage() {
  return (
    <Page className="space-y-5">
      <h1 className="876-page-title">Projects</h1>
      <Suspense fallback={<OverviewFallback />}>
        <OverviewSection />
      </Suspense>
    </Page>
  )
}

async function OverviewSection() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return <OverviewData organizationId={org.id} base={projectsBase(null)} />
}

function OverviewFallback() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, tile) => (
          <Skeleton key={tile} className="h-[4.25rem] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
