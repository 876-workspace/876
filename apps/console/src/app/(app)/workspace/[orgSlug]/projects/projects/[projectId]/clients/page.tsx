import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { ProjectClientsData } from '@/features/projects/components/clients-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { projects } from '@/lib/clients/projects'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Clients' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Clients' }

  return { title: `${result.data.name} • Clients - Organizations` }
}

export default async function OrganizationProjectClientsPage({
  params,
}: Props) {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Clients" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectClientsData organizationId={org.id} projectId={projectId} />
      </Suspense>
    </>
  )
}
