import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { EditIssueData } from '@/features/projects/components/edit-issue-data'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

type Props = { params: Promise<{ issueRef: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { issueRef } = await params
  return { title: `Edit ${decodeURIComponent(issueRef).toUpperCase()}` }
}

export default async function EditIssuePage({ params }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.edit' })
  const { issueRef } = await params
  const decodedIssueRef = decodeURIComponent(issueRef)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/issues/${encodeURIComponent(decodedIssueRef)}`}
        label={decodedIssueRef.toUpperCase()}
        className="mb-4"
      />
      <ResourceToolbar title={`Edit ${decodedIssueRef.toUpperCase()}`} />
      <Suspense
        fallback={
          <div className="876-card h-96 max-w-2xl animate-pulse" aria-hidden="true" />
        }
      >
        <EditIssueData issueRef={decodedIssueRef} />
      </Suspense>
    </div>
  )
}
