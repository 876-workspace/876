import type { MetricsSummary } from './types'

export type MetricsSummaryPanelProps = {
  summary: MetricsSummary
}

export const METRICS_WINDOW_LABELS: Record<'24h' | '7d', string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
}

/**
 * Formats a failure rate with one decimal using integer maths only.
 * `total === 0` renders as an em dash.
 */
export function formatFailureRate(total: number, failed: number): string {
  const safeTotal = Math.trunc(total)
  const safeFailed = Math.trunc(failed)
  if (safeTotal <= 0) return '—'
  const tenths = Math.round((safeFailed * 1000) / safeTotal)
  const whole = Math.floor(tenths / 10)
  const decimal = tenths % 10
  return `${whole}.${decimal}%`
}

const SECTIONS = [
  { key: 'automationRuns', label: 'Automation runs' },
  { key: 'webhookDeliveries', label: 'Webhook deliveries' },
  { key: 'importJobs', label: 'Import jobs' },
] as const

export function MetricsSummaryPanel({ summary }: MetricsSummaryPanelProps) {
  if (summary.windows.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No metrics yet
      </p>
    )
  }

  return (
    <div data-slot="metrics-summary-panel" className="grid gap-4 lg:grid-cols-2">
      {summary.windows.map((entry) => (
        <section key={entry.window} className="876-card space-y-3 p-5">
          <h3 className="text-sm font-semibold">
            {METRICS_WINDOW_LABELS[entry.window]}
          </h3>
          <dl className="space-y-3">
            {SECTIONS.map((section) => {
              const counts = entry[section.key]
              return (
                <div
                  key={section.key}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <dt className="font-medium">{section.label}</dt>
                  <dd className="text-muted-foreground tabular-nums">
                    {counts.total} total · {counts.failed} failed ·{' '}
                    <span data-slot={`failure-rate-${entry.window}-${section.key}`}>
                      {formatFailureRate(counts.total, counts.failed)}
                    </span>
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ))}
    </div>
  )
}
