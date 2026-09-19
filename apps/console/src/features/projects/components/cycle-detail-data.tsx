import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { IssuesTable } from '@876/projects-ui/issue-list'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'

import { formatOperatorDateOrDash } from './operator-format'

function statusBadge(status: string) {
  if (status === 'active') return <Badge variant="success">Active</Badge>
  if (status === 'completed') return <Badge variant="secondary">Completed</Badge>
  return <Badge variant="info">Upcoming</Badge>
}

/**
 * The data half of the Cycle detail, shared by every host. `@876/projects-ui`
 * ships no cycle presentation, so the facts card is Console-local markup; the
 * assigned work items reuse the shared issues table.
 */
export async function CycleDetailData({
  organizationId,
  base,
  cycleId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  cycleId: string
}) {
  const cycleResult = await projects.cycles.retrieve(
    organizationId,
    decodeURIComponent(cycleId)
  )

  if (cycleResult.error?.code === 'projects/cycle-not-found') notFound()

  if (cycleResult.error || !cycleResult.data) {
    return (
      <AppError
        title="Cycle could not be loaded"
        error={cycleResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const cycle = cycleResult.data
  const [projectResult, issuesResult] = await Promise.all([
    cycle.projectId
      ? projects.projects.retrieve(organizationId, cycle.projectId)
      : Promise.resolve({ data: null, error: null } as const),
    projects.issues.list(organizationId, {
      ...(cycle.projectId ? { project: cycle.projectId } : {}),
      limit: 100,
    }),
  ])

  const loadError = projectResult.error ?? issuesResult.error
  const assigned = (issuesResult.data?.data ?? []).filter(
    (issue) => issue.cycleId === cycle.id
  )
  const progressPercent =
    cycle.progress.total === 0
      ? 0
      : Math.round(
          (cycle.progress.completed / cycle.progress.total) * 100
        )

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Some cycle details could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <section className="876-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              Cycle {cycle.number}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{cycle.name}</h2>
            {cycle.goal ? (
              <p className="text-muted-foreground mt-1 text-sm">{cycle.goal}</p>
            ) : null}
          </div>
          {statusBadge(cycle.status)}
        </div>
        <div className="mt-5">
          <DetailCardSection title="Details">
            <DetailCardFacts>
              <DetailCardFact
                label="Project"
                value={
                  cycle.projectId
                    ? (projectResult.data?.name ?? cycle.projectId)
                    : 'Unassigned'
                }
              />
              <DetailCardFact
                label="Starts"
                value={formatOperatorDateOrDash(cycle.startsAt)}
              />
              <DetailCardFact
                label="Ends"
                value={formatOperatorDateOrDash(cycle.endsAt)}
              />
              <DetailCardFact
                label="Progress"
                value={`${cycle.progress.completed}/${cycle.progress.total} (${progressPercent}%)`}
              />
            </DetailCardFacts>
          </DetailCardSection>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-[0.9375rem] font-semibold">
          Assigned work items ({assigned.length})
        </h2>
        <IssuesTable
          issues={assigned}
          issuesHref={`${base}/issues`}
          newIssueHref={null}
        />
      </section>
    </div>
  )
}
