import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { Suspense } from 'react'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { BoardData } from '@/features/projects/components/board-data'
import { getPlatformOrganization } from '@/lib/platform-org'

import { PLATFORM_PROJECTS_BASE } from '../_lib/base'

export const metadata = { title: 'Board' }

export default function PlatformIssueBoardPage() {
  return (
    <Page>
      <ResourceToolbar title="Board" refresh />
      <Suspense fallback={<BoardFallback />}>
        <BoardSection />
      </Suspense>
    </Page>
  )
}

async function BoardSection() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return <BoardData organizationId={org.id} base={PLATFORM_PROJECTS_BASE} />
}

function BoardFallback() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 6 }, (_, column) => (
        <div
          key={column}
          className="bg-muted/30 border-border/60 flex min-w-[280px] flex-1 flex-col rounded-xl border p-3"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            {Array.from({ length: 3 }, (_, card) => (
              <Skeleton key={card} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
