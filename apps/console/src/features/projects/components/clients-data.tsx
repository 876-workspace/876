import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { toUiClientGrant } from '../collaboration-mappers'
import { projects } from '@/lib/services/projects'

import { ReadOnlyClientGrantList } from './read-only-client-grants'

/**
 * The data half of the project Clients tab, shared by every host.
 * Read-only: every grant including revoked ones, with no invite or revoke
 * affordances. The shared `ClientGrantList` requires a `revokeActionBase`,
 * so Console renders the local `ReadOnlyClientGrantList` instead.
 */
export async function ProjectClientsData({
  organizationId,
  projectId,
}: {
  organizationId: string
  projectId: string
}) {
  const [projectResult, grantsResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.clientGrants.list(organizationId, projectId, {
      limit: 100,
      includeRevoked: true,
    }),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  if (grantsResult.error || !grantsResult.data) {
    return (
      <AppError
        title="Client grants could not be loaded"
        error={grantsResult.error}
        variant="banner"
        showCode
      />
    )
  }

  return (
    <ReadOnlyClientGrantList
      grants={grantsResult.data.data.map(toUiClientGrant)}
    />
  )
}
