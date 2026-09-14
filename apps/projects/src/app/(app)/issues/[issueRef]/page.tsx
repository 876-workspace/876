import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { IssueDetailData } from './_components/issue-detail-data'
import { IssueDetailSkeleton } from './_components/issue-detail-skeleton'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

type Props = { params: Promise<{ issueRef: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { issueRef } = await params
  return { title: decodeURIComponent(issueRef).toUpperCase() }
}

export default async function IssueDetailPage({ params }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.view' })
  const { orgId, userId } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/issues" label="Issues" className="mb-4" />
      <Suspense fallback={<IssueDetailSkeleton />}>
        <IssueDetailDataFromParams
          orgId={orgId}
          userId={userId}
          params={params}
        />
      </Suspense>
    </div>
  )
}

async function IssueDetailDataFromParams({
  orgId,
  userId,
  params,
}: {
  orgId: string
  userId: string
  params: Props['params']
}) {
  const { issueRef } = await params
  return <IssueDetailData orgId={orgId} userId={userId} issueRef={issueRef} />
}
