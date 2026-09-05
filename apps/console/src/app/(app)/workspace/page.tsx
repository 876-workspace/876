import Link from 'next/link'
import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ChevronRight, Squares2X2Icon } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import {
  entitledWorkspaces,
  workspaceIndex,
} from '@/features/orgs/app-workspaces'
import { WorkspaceIcon } from '@/features/orgs/components/workspace-icon'
import {
  resolveActiveOrganizations,
  resolveOrgEntitledAppSlugs,
} from '@/features/orgs/org-data'

export const metadata = { title: 'Workspaces' }

export default function WorkspaceIndexPage() {
  return (
    <Page hub>
      <div className="mb-8">
        <h1 className="876-page-title">Workspaces</h1>
      </div>
      <Suspense fallback={<WorkspaceGridSkeleton />}>
        <OrganizationWorkspaceGrid />
      </Suspense>
    </Page>
  )
}

async function OrganizationWorkspaceGrid() {
  const organizations = await resolveActiveOrganizations()
  if (organizations.error || !organizations.data) {
    return (
      <AppError
        title="Organizations could not be loaded"
        error={organizations.error}
        variant="banner"
        showCode
      />
    )
  }

  if (organizations.data.data.length === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Squares2X2Icon />
          </EmptyMedia>
          <EmptyTitle>No organizations</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {organizations.data.data.map((organization) => (
        <Suspense key={organization.id} fallback={<WorkspaceTileSkeleton />}>
          <OrganizationWorkspaceTile
            organizationId={organization.id}
            organizationName={organization.name ?? organization.slug}
            orgSlug={organization.slug}
          />
        </Suspense>
      ))}
    </ul>
  )
}

async function OrganizationWorkspaceTile({
  organizationId,
  organizationName,
  orgSlug,
}: {
  organizationId: string
  organizationName: string
  orgSlug: string
}) {
  const entitlements = await resolveOrgEntitledAppSlugs(organizationId)
  const workspaces = entitledWorkspaces(entitlements.data)

  return (
    <li className="876-card p-5">
      <Link
        href={workspaceIndex(orgSlug)}
        className="group flex items-center gap-2 font-medium"
      >
        {organizationName}
        <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      {entitlements.error ? (
        <AppError
          title="App entitlements could not be loaded"
          error={entitlements.error}
          variant="inline"
          showCode
        />
      ) : workspaces.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">No app workspaces</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {workspaces.map((workspace) => (
            <li key={workspace.key}>
              <Link
                href={`${workspaceIndex(orgSlug)}/${workspace.key}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
              >
                <WorkspaceIcon
                  iconKey={workspace.iconKey}
                  colored
                  className="size-4"
                />
                {workspace.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function WorkspaceGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <WorkspaceTileSkeleton key={index} />
      ))}
    </div>
  )
}

function WorkspaceTileSkeleton() {
  return <Skeleton className="h-36 rounded-lg" />
}
