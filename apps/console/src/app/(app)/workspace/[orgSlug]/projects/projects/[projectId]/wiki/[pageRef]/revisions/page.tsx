import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { WikiRevisionsData } from '@/features/projects/components/wiki-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { projects } from '@/lib/clients/projects'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string; pageRef: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId, pageRef } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Revisions' }

  const result = await projects.wiki.retrieve(
    org.id,
    projectId,
    decodeURIComponent(pageRef),
  )
  if (!result.data) return { title: 'Revisions' }

  return { title: `${result.data.title} • Revisions - Organizations` }
}

export default async function OrganizationWikiRevisionsPage({
  params,
}: Props) {
  const { orgSlug, projectId, pageRef } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Revisions" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <WikiRevisionsData
          organizationId={org.id}
          projectId={projectId}
          pageRef={pageRef}
        />
      </Suspense>
    </>
  )
}
