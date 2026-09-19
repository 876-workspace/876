import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'

import { formatOperatorDateOrDash } from './operator-format'
import { ReadOnlyGanttView } from './read-only-gantt-view'

function formatVarianceDays(minutes: number | null): string {
  if (minutes === null) return '—'
  const days = Math.round(minutes / 1440)
  if (days === 0) return '0 d'
  return `${days > 0 ? '+' : '−'}${Math.abs(days)} d`
}

/**
 * The data half of the project Gantt tab, shared by every host. The timeline
 * itself is read-only (no drag); the baseline selector is plain navigation so
 * choosing a baseline never needs client state.
 */
export async function ProjectGanttData({
  organizationId,
  base,
  projectId,
  baselineId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
  baselineId?: string
}) {
  const [ganttResult, baselinesResult] = await Promise.all([
    projects.gantt.retrieve(organizationId, projectId, {
      includeSubItems: true,
    }),
    projects.baselines.list(organizationId, projectId),
  ])

  if (ganttResult.error?.code === 'projects/project-not-found') notFound()

  if (ganttResult.error || !ganttResult.data) {
    return (
      <AppError
        title="Gantt could not be loaded"
        error={ganttResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const baselines = baselinesResult.data?.data ?? []
  const selectedBaselineId = baselineId ?? baselines[0]?.id ?? null
  const comparisonResult = selectedBaselineId
    ? await projects.baselines.comparison(
        organizationId,
        projectId,
        selectedBaselineId
      )
    : null
  const baselineError =
    baselinesResult.error ?? comparisonResult?.error ?? null
  const ganttHref = `${base}/projects/${encodeURIComponent(projectId)}/gantt`
  const comparison = comparisonResult?.data?.items ?? []

  return (
    <div className="space-y-4">
      {baselineError ? (
        <AppError
          title="Some baseline data could not be loaded"
          error={baselineError}
          variant="banner"
          showCode
        />
      ) : null}
      <ReadOnlyGanttView
        gantt={ganttResult.data}
        issuesBaseHref={`${base}/issues`}
      />
      <section className="876-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[0.9375rem] font-semibold">Baseline:</h2>
          <Link
            href={ganttHref}
            className={
              selectedBaselineId === null
                ? 'font-medium'
                : 'text-876-accent-fg hover:underline'
            }
          >
            Current plan
          </Link>
          {baselines.map((baseline) => (
            <Link
              key={baseline.id}
              href={`${ganttHref}?baselineId=${encodeURIComponent(baseline.id)}`}
              className={
                selectedBaselineId === baseline.id
                  ? 'font-medium'
                  : 'text-876-accent-fg hover:underline'
              }
            >
              {baseline.name}
            </Link>
          ))}
          {baselines.length === 0 ? (
            <span className="text-muted-foreground text-sm">
              No baselines captured yet.
            </span>
          ) : null}
        </div>
        {selectedBaselineId && comparison.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Work item</th>
                  <th className="px-4 py-3 font-medium">Baseline start</th>
                  <th className="px-4 py-3 font-medium">Current start</th>
                  <th className="px-4 py-3 font-medium">Start variance</th>
                  <th className="px-4 py-3 font-medium">Finish variance</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {comparison.map((item) => (
                  <tr key={item.issueId}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.identifier}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDateOrDash(item.baselineStart)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDateOrDash(item.currentStart)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatVarianceDays(item.startVarianceMinutes)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatVarianceDays(item.finishVarianceMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
