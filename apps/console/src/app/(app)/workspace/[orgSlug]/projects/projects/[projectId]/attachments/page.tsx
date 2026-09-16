import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AttachmentsData } from '@/features/projects/components/attachments-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { ATTACHMENTS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Attachments' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Attachments' }

  return { title: `${result.data.name} • Attachments - Organizations` }
}

export default async function OrganizationProjectAttachmentsPage({
  params,
}: Props) {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Attachments" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ATTACHMENTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <ProjectAttachmentsSection
          organizationId={org.id}
          orgSlug={orgSlug}
          projectId={projectId}
        />
      </Suspense>
    </>
  )
}

async function ProjectAttachmentsSection({
  organizationId,
  orgSlug,
  projectId,
}: {
  organizationId: string
  orgSlug: string
  projectId: string
}) {
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
