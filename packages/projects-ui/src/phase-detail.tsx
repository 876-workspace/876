import type {
  MilestoneCustomField,
  MilestoneCustomFieldValue,
  MilestoneDetail,
  MilestoneEvent,
  MilestoneSummary,
  Project,
} from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Calendar, Folder, Pencil, User } from '@876/ui/icons'
import Link from 'next/link'

export type PhaseDetailProps = {
  phase: MilestoneDetail
  project: Project | null
  summary: MilestoneSummary | null
  events?: readonly MilestoneEvent[]
  fields?: readonly MilestoneCustomField[]
  fieldValues?: readonly MilestoneCustomFieldValue[]
  ownerLabels?: Readonly<Record<string, string>>
  editHref?: string
  cloneHref?: string
}

function formatDate(timestamp: number | null) {
  return timestamp
    ? new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'
}

function statusBadge(status: string) {
  if (status === 'completed') return <Badge variant="success">Completed</Badge>
  if (status === 'canceled') return <Badge variant="secondary">Canceled</Badge>
  return <Badge variant="info">Open</Badge>
}

function valueText(value: MilestoneCustomFieldValue['value']) {
  if (value === null || value === '') return 'Not set'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not set'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function PhaseDetail({
  phase,
  project,
  summary,
  events = [],
  fields = [],
  fieldValues = [],
  ownerLabels = {},
  editHref,
  cloneHref,
}: PhaseDetailProps) {
  const fieldLabels = new Map(fields.map((field) => [field.id, field.label]))
  const owner = phase.ownerUserId
    ? ownerLabels[phase.ownerUserId] ?? phase.ownerUserId
    : 'Unassigned'

  return (
    <div className="space-y-6">
      <header className="876-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="bg-primary/10 text-primary border-primary/15 flex size-12 shrink-0 items-center justify-center rounded-xl border">
              <Folder aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="text-muted-foreground font-mono text-xs">
                {project?.key ?? 'PROJECT'} · {phase.key}
              </div>
              <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                {phase.name}
              </h1>
              {phase.description ? (
                <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                  {phase.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(phase.status)}
            {cloneHref ? (
              <Link
                href={cloneHref}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Clone
              </Link>
            ) : null}
            {editHref ? (
              <Link
                href={editHref}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="876-card p-5 sm:p-6">
            <DetailCardSection title="Progress">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    {summary
                      ? `${summary.completedIssueCount} of ${summary.issueCount} work items completed`
                      : 'Progress unavailable'}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {summary ? `${summary.progressPercent}%` : '—'}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${summary?.progressPercent ?? 0}%` }}
                  />
                </div>
              </div>
            </DetailCardSection>
          </section>

          {fieldValues.length > 0 ? (
            <section className="876-card p-5 sm:p-6">
              <DetailCardSection title="Custom fields">
                <DetailCardFacts>
                  {fieldValues.map((value) => (
                    <DetailCardFact
                      key={value.id}
                      label={fieldLabels.get(value.fieldId) ?? value.fieldKey}
                      value={valueText(value.value)}
                    />
                  ))}
                </DetailCardFacts>
              </DetailCardSection>
            </section>
          ) : null}

          <section className="876-card p-5 sm:p-6">
            <DetailCardSection title="Activity">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet.</p>
              ) : (
                <ol className="border-border/70 space-y-0 border-l">
                  {events.map((event) => (
                    <li key={event.id} className="relative pb-5 pl-5 last:pb-0">
                      <span className="bg-primary border-background absolute top-1.5 -left-1.5 size-3 rounded-full border-2" />
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">
                          {event.actorUserId
                            ? ownerLabels[event.actorUserId] ?? event.actorUserId
                            : 'System'}
                        </span>
                        <span className="text-muted-foreground">
                          {event.type.replaceAll('-', ' ')}
                        </span>
                        {event.fromValue || event.toValue ? (
                          <span className="text-muted-foreground">
                            {event.fromValue ?? '—'} → {event.toValue ?? '—'}
                          </span>
                        ) : null}
                      </div>
                      <time className="text-muted-foreground mt-1 block text-xs">
                        {formatDate(event.createdAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </DetailCardSection>
          </section>
        </div>

        <aside className="876-card h-fit p-5">
          <DetailCardSection title="Details">
            <DetailCardFacts className="grid-cols-1">
              <DetailCardFact label="Project" value={project?.name ?? phase.projectId} />
              <DetailCardFact
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <User aria-hidden="true" className="size-3.5" /> Owner
                  </span>
                }
                value={owner}
              />
              <DetailCardFact
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar aria-hidden="true" className="size-3.5" /> Start
                  </span>
                }
                value={formatDate(phase.startDate)}
              />
              <DetailCardFact label="Target" value={formatDate(phase.targetDate)} />
              <DetailCardFact label="Order" value={String(phase.position)} />
              <DetailCardFact label="Updated" value={formatDate(phase.updatedAt)} />
            </DetailCardFacts>
          </DetailCardSection>
        </aside>
      </div>
    </div>
  )
}
