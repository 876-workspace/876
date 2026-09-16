import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LayoutDetailData } from '@/features/projects/components/layout-detail-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = {
  params: Promise<{ layoutId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { layoutId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.layouts.retrieve(
    organizationId,
    decodeURIComponent(layoutId)
  )
  if (!result.data) return { title: 'Layout' }

  return { title: `${result.data.name} • Layouts` }
}

export default async function PlatformLayoutDetailPage({ params }: Props) {
  const { layoutId } = await params

  return (
    <Page>
      <Suspense fallback={<LayoutDetailFallback />}>
        <LayoutDetailSection layoutId={layoutId} />
      </Suspense>
    </Page>
  )
}

async function LayoutDetailSection({ layoutId }: { layoutId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <LayoutDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      layoutId={layoutId}
    />
  )
}

function LayoutDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
