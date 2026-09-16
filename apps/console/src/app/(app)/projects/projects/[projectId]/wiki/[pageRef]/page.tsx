import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { WikiPageData } from '@/features/projects/components/wiki-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../../../_lib/base'

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
  if (!result.data) return { title: 'Wiki page' }

  return { title: `${result.data.title} • Wiki - Projects` }
}

export default async function PlatformWikiPageDetailPage({ params }: Props) {
  const { projectId, pageRef } = await params
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <Suspense fallback={<WikiPageFallback />}>
        <WikiPageSection projectId={projectId} pageRef={pageRef} />
      </Suspense>
    </Page>
  )
}

async function WikiPageSection({
  projectId,
  pageRef,
}: {
  projectId: string
  pageRef: string
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <WikiPageData
      organizationId={organizationId}
      base={projectsBase(null)}
      projectId={projectId}
      pageRef={pageRef}
    />
  )
}

function WikiPageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
