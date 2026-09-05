import { Suspense } from 'react'

import {
  entitledWorkspaces,
  findAppWorkspace,
} from '@/features/orgs/app-workspaces'
import {
  WorkspaceSwitchers,
  type WorkspaceSwitcherApp,
  type WorkspaceSwitcherOrg,
} from '@/features/orgs/components/workspace-switchers'
import {
  resolveActiveOrganizations,
  resolveOrg,
  resolveOrgEntitledAppSlugs,
} from '@/features/orgs/org-data'

export function WorkspaceHeader({
  orgSlug,
  workspaceKey,
}: {
  orgSlug: string
  workspaceKey: string
}) {
  // Streams: the header is chrome and must not wait on the organization lookup
  // or the entitlement list.
  return (
    <Suspense fallback={<div className="h-7" />}>
      <WorkspaceHeaderData orgSlug={orgSlug} workspaceKey={workspaceKey} />
    </Suspense>
  )
}

async function WorkspaceHeaderData({
  orgSlug,
  workspaceKey,
}: {
  orgSlug: string
  workspaceKey: string
}) {
  const workspace = findAppWorkspace(workspaceKey)
  if (!workspace) return null

  // The directory does not depend on this organization, so it must not wait
  // behind the lookup that the entitlement list genuinely does depend on.
  const [org, orgsResult] = await Promise.all([
    resolveOrg(orgSlug),
    resolveActiveOrganizations(),
  ])
  const entitled = org
    ? entitledWorkspaces((await resolveOrgEntitledAppSlugs(org.id)).data)
    : []
  const orgRecords =
    orgsResult.error || !orgsResult.data ? [] : orgsResult.data.data

  const orgs: WorkspaceSwitcherOrg[] = orgRecords.map((item) => ({
    slug: item.slug,
    name: item.name ?? item.slug,
  }))

  if (!orgs.some((item) => item.slug === orgSlug)) {
    orgs.push({
      slug: orgSlug,
      name: org?.name ?? orgSlug,
    })
  }

  orgs.sort((a, b) => a.name.localeCompare(b.name))

  const apps: WorkspaceSwitcherApp[] = entitled.map((item) => ({
    key: item.key,
    label: item.label,
    iconKey: item.iconKey,
  }))

  return (
    <WorkspaceSwitchers
      orgSlug={orgSlug}
      orgName={org?.name ?? orgSlug}
      workspaceKey={workspaceKey}
      workspaceLabel={workspace.label}
      orgs={orgs}
      apps={apps}
    />
  )
}
