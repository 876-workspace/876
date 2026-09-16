import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { WikiPageData } from '@/features/projects/components/wiki-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { projects } from '@/lib/services/projects'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string; pageRef: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId, pageRef } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Wiki page' }

  const result = await projects.wiki.retrieve(
    org.id,
    projectId,
    decodeURIComponent(pageRef),
  )
  if (!result.data) return { title: 'Wiki page' }

  return { title: `${result.data.title} • Wiki - Organizations` }
}

export default async function OrganizationWikiPageDetailPage({
  params,
}: Props) {
  const { orgSlug, projectId, pageRef } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <Suspense fallback={<WikiPageFallback />}>
        <WikiPageData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={projectId}
          pageRef={pageRef}
        />
      </Suspense>
    </>
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
