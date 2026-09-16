import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { CloneProjectData } from '@/features/templates/components/clone-project-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Clone project' }

type Props = { params: Promise<{ projectId: string }> }

export default async function CloneProjectPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()
  const { projectId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}`}
        label="Project"
        className="mb-4"
      />
      <ResourceToolbar title="Clone project" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <CloneProjectData
          orgId={orgId}
          projectId={decodeURIComponent(projectId)}
        />
      </Suspense>
    </div>
  )
}
