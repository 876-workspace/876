import { AppError } from '@876/ui/app-error'
import { PhaseList } from '@876/projects-ui/phase-list'

import type { PhaseStatus } from '../phase-status'
import { projects } from '@/lib/services/projects'

/**
 * The data half of the Phases list, shared by every host.
 */
export async function PhasesData({
  organizationId,
  base,
  status,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  /** Already narrowed by the route's isPhaseStatus guard. */
  status?: PhaseStatus
}) {
  const [phasesResult, projectsResult] = await Promise.all([
    projects.milestones.listAll(
      organizationId,
      status ? { status } : undefined
    ),
    projects.projects.list(organizationId, { limit: 100 }),
  ])

  const loadError = phasesResult.error ?? projectsResult.error

  return (
    <div className="space-y-3">
      {loadError ? (
        <AppError
          title="Some phase data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <PhaseList
        phases={phasesResult.data?.data ?? []}
        projects={projectsResult.data?.data ?? []}
        phasesHref={`${base}/phases`}
      />
    </div>
  )
}
