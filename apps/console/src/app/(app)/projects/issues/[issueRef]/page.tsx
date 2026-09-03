import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { IssueDetailData } from '@/features/projects/components/issue-detail-data'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'
import { PLATFORM_PROJECTS_BASE } from '../../_lib/paths'

type Props = { params: Promise<{ issueRef: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { issueRef } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.issues.retrieve(organizationId, issueRef)
  if (!result.data) return { title: 'Issue' }

  return { title: `${result.data.identifier}: ${result.data.title} • Issues` }
}

export default async function PlatformIssueDetailPage({ params }: Props) {
  const { issueRef } = await params

  return (
    <Suspense fallback={<IssueDetailFallback />}>
      <IssueDetailSection issueRef={issueRef} />
    </Suspense>
  )
}

async function IssueDetailSection({ issueRef }: { issueRef: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <IssueDetailData
      organizationId={organizationId}
      base={PLATFORM_PROJECTS_BASE}
      issueRef={issueRef}
    />
  )
}

function IssueDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  )
}
