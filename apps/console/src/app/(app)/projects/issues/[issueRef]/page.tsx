import { Skeleton } from '@876/ui/skeleton'
import { Page } from '@876/ui/page'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { IssueDetailData } from '@/features/projects/components/issue-detail-data'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'
import { projectsBase } from '@/features/orgs/app-workspaces'

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
    <Page>
      <Suspense fallback={<IssueDetailFallback />}>
        <IssueDetailSection issueRef={issueRef} />
      </Suspense>
    </Page>
  )
}

async function IssueDetailSection({ issueRef }: { issueRef: string }) {
  const organizationId = await requirePlatformProjectsOrgId()
  const session = await getAuthSession()
  const actorUserId = isSignedSession(session) ? session.user.id : null

  return (
    <IssueDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      issueRef={issueRef}
      actorUserId={actorUserId}
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
