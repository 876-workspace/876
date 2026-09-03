import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { OverviewData } from '@/features/projects/components/overview-data'

import { resolveOrg } from '../../_data'
import { workspaceProjectsBase } from './_lib/base'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Projects' }

  return { title: `${org.name ?? org.slug} • Projects - Organizations` }
}

export default async function ProjectsWorkspaceOverviewPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <div className="space-y-5">
      <h1 className="876-page-title">Overview</h1>
      <Suspense fallback={<OverviewFallback />}>
        <OverviewData
          organizationId={org.id}
          base={workspaceProjectsBase(slug)}
        />
      </Suspense>
    </div>
  )
}

function OverviewFallback() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[4.25rem] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
