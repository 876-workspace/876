import { IssueDetail } from '@876/projects-ui/issue-detail'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'
import { IssueCommentsData } from '@/features/projects/components/issue-comments-data'

type Props = { params: Promise<{ issueRef: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { issueRef } = await params
  return { title: decodeURIComponent(issueRef).toUpperCase() }
}

export default async function IssueDetailPage({ params }: Props) {
  await requireAppPermission('issues.view')
  const { issueRef } = await params
  const { orgId, userId } = await requireProjectsContext()

  const result = await projects.issues.retrieve(
    orgId,
    decodeURIComponent(issueRef)
  )
  if (!result.data) notFound()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/issues" label="Issues" className="mb-4" />
      <IssueDetail
        issue={result.data}
        projectHref={`/projects/${result.data.projectId}`}
      />
      <div className="mt-6 lg:mr-[33.333333%]">
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">
              Loading comments…
            </div>
          }
        >
          <CommentsData
            orgId={orgId}
            issueRef={result.data.identifier}
            currentUserId={userId}
          />
        </Suspense>
      </div>
    </div>
  )
}

async function CommentsData({
  orgId,
  issueRef,
  currentUserId,
}: {
  orgId: string
  issueRef: string
  currentUserId: string
}) {
  const result = await projects.comments.list(orgId, issueRef)
  return (
    <IssueCommentsData
      issueRef={issueRef}
      comments={result.data?.data ?? []}
      currentUserId={currentUserId}
    />
  )
}
