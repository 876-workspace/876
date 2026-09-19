import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { WikiRevisionsData } from '@/features/projects/components/wiki-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../../../_lib/base'

type Props = {
  params: Promise<{ projectId: string; pageRef: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, pageRef } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.wiki.retrieve(
    organizationId,
    projectId,
    decodeURIComponent(pageRef),
  )
  if (!result.data) return { title: 'Revisions' }

  return { title: `${result.data.title} • Revisions - Projects` }
}

export default async function PlatformWikiRevisionsPage({ params }: Props) {
  const { projectId, pageRef } = await params
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Revisions" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <WikiRevisionsSection projectId={projectId} pageRef={pageRef} />
      </Suspense>
    </Page>
  )
}

async function WikiRevisionsSection({
  projectId,
  pageRef,
}: {
  projectId: string
  pageRef: string
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <WikiRevisionsData
      organizationId={organizationId}
      projectId={projectId}
      pageRef={pageRef}
    />
  )
}
