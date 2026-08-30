import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
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
import {
  resolveOrg,
  resolveOrgEntitledAppSlugs,
  resolveOrgResult,
} from '../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Workspaces' }

  return { title: `${org.name ?? org.slug} • Workspaces - Organizations` }
}

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
  const orgResult = await resolveOrgResult(slug)
  if (orgResult.error?.code === 'organization/not-found') notFound()
  if (orgResult.error)
    return (
      <AppError
        title="Organization workspaces are temporarily unavailable"
        error={orgResult.error}
        variant="banner"
        showCode
      />
    )
  if (!orgResult.data) notFound()

  const entitlementResult = await resolveOrgEntitledAppSlugs(orgResult.data.id)
  const workspaces = entitledWorkspaces(entitlementResult.data)

  return (
    <div className="space-y-4">
      {entitlementResult.error ? (
        <AppError
          title="App entitlement data is temporarily unavailable"
          error={entitlementResult.error}
          variant="banner"
          showCode
        />
      ) : null}

      {workspaces.length === 0 && !entitlementResult.error ? (
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
      ) : null}

      {workspaces.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <li key={workspace.key}>
              <Link
                href={workspaceBase(slug, workspace.key)}
                className="876-card hover:border-876-accent-fg/40 group flex h-full items-start gap-3 p-4 transition-colors"
              >
                <span className="bg-876-accent-surface text-876-accent-fg flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <WorkspaceIcon
                    iconKey={workspace.iconKey}
                    className="size-5"
                  />
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
      ) : null}
    </div>
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
