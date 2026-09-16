import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectClientsData } from '@/features/projects/components/clients-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Clients' }

  return { title: `${result.data.name} • Clients - Projects` }
}

export default async function PlatformProjectClientsPage({ params }: Props) {
  const { projectId } = await params
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Clients" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectClientsSection projectId={projectId} />
      </Suspense>
    </Page>
  )
}

async function ProjectClientsSection({ projectId }: { projectId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectClientsData organizationId={organizationId} projectId={projectId} />
  )
}
