import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { BoardData } from '@/features/projects/components/board-data'

import { resolveOrg } from '../../../_data'
import { workspaceProjectsBase } from '../_lib/base'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Board' }

  return { title: `${org.name ?? org.slug} • Board - Organizations` }
}

export default async function OrganizationIssueBoardPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Board" refresh />
      <Suspense fallback={<BoardFallback />}>
        <BoardData organizationId={org.id} base={workspaceProjectsBase(slug)} />
      </Suspense>
    </div>
  )
}

function BoardFallback() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="bg-muted/30 border-border/60 flex min-w-[280px] flex-1 flex-col rounded-xl border p-3"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            {Array.from({ length: 3 }, (_, j) => (
              <Skeleton key={j} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
