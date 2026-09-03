import { IssueDetail } from '@876/projects-ui/issue-detail'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

type Props = { params: Promise<{ issueRef: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { issueRef } = await params
  return { title: decodeURIComponent(issueRef).toUpperCase() }
}

export default async function IssueDetailPage({ params }: Props) {
  await requireAppPermission('issues.view')
  const { issueRef } = await params
  const { orgId } = await requireProjectsContext()

  const result = await projects.issues.retrieve(
    orgId,
    decodeURIComponent(issueRef)
  )
  if (!result.data) notFound()

  const comments = await projects.comments.list(orgId, result.data.identifier)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/issues" label="Issues" className="mb-4" />
      <IssueDetail
        issue={result.data}
        comments={comments.data?.data ?? []}
        issuesHref="/issues"
        projectHref={`/projects/${result.data.projectId}`}
      />
    </div>
  )
}
