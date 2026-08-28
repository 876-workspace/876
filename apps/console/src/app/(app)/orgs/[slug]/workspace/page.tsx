import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ChevronRight, Squares2X2Icon } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import {
  entitledWorkspaces,
  workspaceBase,
} from '@/features/orgs/app-workspaces'
import { WorkspaceIcon } from '@/features/orgs/components/workspace-icon'
import { resolveOrg, resolveOrgEntitledAppSlugs } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Workspaces' }

  return { title: `${org.name ?? org.slug} • Workspaces - Organizations` }
}

/**
 * The workspace index — every app this organization is actually working in.
 *
 * This page is the answer to "how does Console scale to N apps without N tabs".
 * The organization detail strip carries one `Workspaces` tab; the list of apps
 * behind it is derived from entitlements, so a new app costs a registry row and
 * never a layout change.
 */
export default async function OrganizationWorkspacePage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">Workspaces</h1>
      </div>
      <Suspense fallback={<WorkspaceCardsSkeleton />}>
        <WorkspaceCards slug={slug} />
      </Suspense>
    </div>
  )
}

async function WorkspaceCards({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const workspaces = entitledWorkspaces(
    await resolveOrgEntitledAppSlugs(org.id)
  )

  if (workspaces.length === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Squares2X2Icon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No app workspaces</EmptyTitle>
          <EmptyDescription>
            This organization is not entitled to an app Console can open yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {workspaces.map((workspace) => (
        <li key={workspace.key}>
          <Link
            href={workspaceBase(slug, workspace.key)}
            className="876-card hover:border-876-accent-fg/40 group flex h-full items-start gap-3 p-4 transition-colors"
          >
            <span className="bg-876-accent-surface text-876-accent-fg flex size-9 shrink-0 items-center justify-center rounded-lg">
              <WorkspaceIcon iconKey={workspace.iconKey} className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-medium">
                {workspace.label}
                <ChevronRight
                  className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[0.8125rem]">
                {workspace.summary}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function WorkspaceCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 2 }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}
