import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'

import { NewIssueData } from '@/features/projects/components/new-issue-data'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New issue' }

export default async function NewIssuePage() {
  await requireAppAccess({ module: 'issues', permission: 'issues.create' })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/issues" label="Issues" className="mb-4" />
      <ResourceToolbar title="New issue" />
      <NewIssueData />
    </div>
  )
}
