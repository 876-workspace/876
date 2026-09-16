import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { LayoutDetailData } from '@/features/projects/components/layout-detail-data'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; layoutId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, layoutId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Layout' }

  const result = await projects.layouts.retrieve(
    org.id,
    decodeURIComponent(layoutId)
  )
  if (!result.data) return { title: 'Layout' }

  return { title: `${result.data.name} • Layouts - Organizations` }
}

export default async function OrganizationLayoutDetailPage({ params }: Props) {
  const { orgSlug, layoutId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<LayoutDetailFallback />}>
      <LayoutDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        layoutId={layoutId}
      />
    </Suspense>
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
