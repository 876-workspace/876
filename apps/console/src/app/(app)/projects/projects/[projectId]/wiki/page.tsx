import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectWikiData } from '@/features/projects/components/wiki-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Wiki' }

  return { title: `${result.data.name} • Wiki - Projects` }
}

export default async function PlatformProjectWikiPage({ params }: Props) {
  const { projectId } = await params
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Wiki" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectWikiSection projectId={projectId} />
      </Suspense>
    </Page>
  )
}

async function ProjectWikiSection({ projectId }: { projectId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectWikiData
      organizationId={organizationId}
      base={projectsBase(null)}
      projectId={projectId}
    />
  )
}
