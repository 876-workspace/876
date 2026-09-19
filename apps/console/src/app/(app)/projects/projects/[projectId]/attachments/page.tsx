import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'

import { AttachmentsData } from '@/features/projects/components/attachments-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { ATTACHMENTS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Attachments' }

  return { title: `${result.data.name} • Attachments - Projects` }
}

export default async function PlatformProjectAttachmentsPage({
  params,
}: Props) {
  const { projectId } = await params
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Attachments" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ATTACHMENTS_SKELETON_COLUMNS} rows={8} />
        }
      >
        <ProjectAttachmentsSection projectId={projectId} />
      </Suspense>
    </Page>
  )
}

async function ProjectAttachmentsSection({
  projectId,
}: {
  projectId: string
}) {
  const organizationId = await requirePlatformProjectsOrgId()
  const session = await getAuthSession()
  const actorUserId = isSignedSession(session) ? session.user.id : null

  return (
    <AttachmentsData
      organizationId={organizationId}
      resourceType="project"
      resourceId={projectId}
      actorUserId={actorUserId}
    />
  )
}
