import Link from 'next/link'
import type { CustomField, Issue, IssueEvent } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Markdown } from '@876/ui/markdown'
import { Clock, Folder, Pencil, TagIcon } from '@876/ui/icons'

import { IssuePriorityBadge } from './priority-badges'
import { IssueStatusBadge } from './status-badges'

import { formatDateTime } from './format-date'

export type IssueDetailProps = {
  issue: Issue
  events?: readonly IssueEvent[]
  parentIssue?: Issue | null
  subIssues?: readonly Issue[]
  customFields?: readonly CustomField[]
  userLabels?: Readonly<Record<string, string>>
  issuesHref?: string
  projectHref?: string
  editHref?: string
}

function formatEventType(type: string): string {
  return type
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatCustomFieldValue(value: Issue['customFields'][number]['value']) {
  if (value === null || value === '') return 'Not set'
  if (Array.isArray(value))
    return value.length > 0 ? value.join(', ') : 'Not set'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function userLabel(
  userId: string | null,
  labels: Readonly<Record<string, string>>
): string {
  if (!userId) return 'Not assigned'
  return labels[userId] ?? userId
}

export function IssueDetail({
  issue,
  events = [],
  parentIssue = null,
  subIssues = [],
  customFields = [],
  userLabels = {},
  issuesHref,
  projectHref,
  editHref,
}: IssueDetailProps) {
  const fieldLabels = new Map(
    customFields.map((field) => [field.id, field.label])
  )

  return (
    <div className="space-y-8">
      <header className="876-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="bg-primary/10 text-primary border-primary/15 flex size-12 shrink-0 items-center justify-center rounded-xl border">
              <Folder aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="text-info font-mono text-xs font-semibold tracking-wide">
                {issue.projectKey} · {issue.identifier}
              </div>
              <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                {issue.title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <IssueStatusBadge status={issue.status} />
            <IssuePriorityBadge priority={issue.priority} />
            {issue.blocked ? (
              <Badge variant="destructive">Blocked</Badge>
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
            <DetailCardSection title="Description">
              {issue.description ? (
                <Markdown
                  content={issue.description}
                  className="max-w-3xl text-[0.9375rem] leading-7"
                />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No description has been added to this issue.
                </p>
              )}
            </DetailCardSection>
          </section>

          <section className="876-card p-5 sm:p-6">
            <DetailCardSection title="Work structure">
              <DetailCardFacts className="grid-cols-1 gap-y-5 sm:grid-cols-2">
                <DetailCardFact
                  label="Type"
                  value={issue.type?.name ?? issue.typeKey}
                />
                <DetailCardFact
                  label="Workflow state"
                  value={issue.state?.name ?? issue.status}
                />
                <DetailCardFact
                  label="Phase"
                  value={issue.milestone?.name ?? 'No phase'}
                />
                <DetailCardFact
                  label="Parent"
                  value={
                    parentIssue && issuesHref ? (
                      <Link
                        href={`${issuesHref}/${parentIssue.identifier}`}
                        className="text-sky-600 hover:underline dark:text-sky-400"
                      >
                        <span className="font-mono text-xs">
                          {parentIssue.identifier}
                        </span>{' '}
                        — {parentIssue.title}
                      </Link>
                    ) : parentIssue ? (
                      `${parentIssue.identifier} — ${parentIssue.title}`
                    ) : issue.parentIssueId ? (
                      issue.parentIssueId
                    ) : (
                      'No parent'
                    )
                  }
                  mono={Boolean(issue.parentIssueId && !parentIssue)}
                />
              </DetailCardFacts>
            </DetailCardSection>
          </section>

          {subIssues.length > 0 || issue.subIssueCount > 0 ? (
            <section className="876-card p-5 sm:p-6">
              <DetailCardSection title={`Sub-items (${issue.subIssueCount})`}>
                {subIssues.length > 0 ? (
                  <div className="divide-border divide-y">
                    {subIssues.map((subIssue) => (
                      <div
                        key={subIssue.id}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          {issuesHref ? (
                            <Link
                              href={`${issuesHref}/${subIssue.identifier}`}
                              className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                            >
                              {subIssue.title}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium">
                              {subIssue.title}
                            </span>
                          )}
                          <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                            {subIssue.identifier}
                          </p>
                        </div>
                        <IssueStatusBadge status={subIssue.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {issue.subIssueCount} linked sub-item
                    {issue.subIssueCount === 1 ? '' : 's'}.
                  </p>
                )}
              </DetailCardSection>
            </section>
          ) : null}

          {issue.customFields.length > 0 ? (
            <section className="876-card p-5 sm:p-6">
              <DetailCardSection title="Custom fields">
                <DetailCardFacts className="grid-cols-1 gap-y-5 sm:grid-cols-2">
                  {issue.customFields.map((field) => (
                    <DetailCardFact
                      key={field.id}
                      label={fieldLabels.get(field.fieldId) ?? field.fieldKey}
                      value={formatCustomFieldValue(field.value)}
                    />
                  ))}
                </DetailCardFacts>
              </DetailCardSection>
            </section>
          ) : null}

          <section className="876-card p-5 sm:p-6">
            <DetailCardSection title="Activity">
              {events.length > 0 ? (
                <ol
                  aria-label="Activity timeline"
                  className="border-border/70 space-y-0 border-l"
                >
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="relative grid gap-1 pb-5 pl-5 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <span className="bg-primary border-background absolute top-1.5 -left-1.5 size-3 rounded-full border-2" />
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="text-foreground text-xs font-medium">
                          {event.actorUserId
                            ? (userLabels[event.actorUserId] ??
                              event.actorUserId)
                            : 'System'}
                        </span>
                        <span className="text-muted-foreground">
                          {formatEventType(event.type)}
                        </span>
                        {event.fromValue || event.toValue ? (
                          <span className="text-muted-foreground">
                            {event.fromValue ? event.fromValue : '—'} &rarr;{' '}
                            {event.toValue ? event.toValue : '—'}
                          </span>
                        ) : null}
                      </div>
                      <time className="text-muted-foreground text-xs sm:text-right">
                        {formatDateTime(event.createdAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Clock aria-hidden="true" className="size-4" />
                  No activity yet.
                </div>
              )}
            </DetailCardSection>
          </section>
        </div>

        <div className="space-y-4">
          <aside className="876-card p-5">
            <DetailCardSection title="Details">
              <DetailCardFacts className="grid-cols-1 gap-y-5">
                <DetailCardFact
                  label="Project"
                  mono
                  value={
                    projectHref ? (
                      <Link
                        href={projectHref}
                        className="font-mono text-xs text-sky-600 hover:underline dark:text-sky-400"
                      >
                        {issue.projectKey}
                      </Link>
                    ) : (
                      <span>{issue.projectKey}</span>
                    )
                  }
                />
                <DetailCardFact
                  label="Assignee"
                  value={userLabel(issue.assigneeUserId, userLabels)}
                  mono={Boolean(
                    issue.assigneeUserId && !userLabels[issue.assigneeUserId]
                  )}
                />
                <DetailCardFact
                  label="Creator"
                  value={
                    issue.creatorUserId
                      ? (userLabels[issue.creatorUserId] ?? issue.creatorUserId)
                      : 'Unknown creator'
                  }
                  mono={Boolean(
                    issue.creatorUserId && !userLabels[issue.creatorUserId]
                  )}
                />
                <DetailCardFact
                  label="Due date"
                  value={formatDateTime(issue.dueDate)}
                />
                <DetailCardFact
                  label="Estimate"
                  value={
                    issue.estimate === null
                      ? 'No estimate'
                      : `${issue.estimate} points`
                  }
                />
                <DetailCardFact
                  label="Started"
                  value={formatDateTime(issue.startedAt)}
                />
                {issue.completedAt ? (
                  <DetailCardFact
                    label="Completed"
                    value={formatDateTime(issue.completedAt)}
                  />
                ) : null}
                {issue.canceledAt ? (
                  <DetailCardFact
                    label="Canceled"
                    value={formatDateTime(issue.canceledAt)}
                  />
                ) : null}
                <DetailCardFact
                  label="Updated"
                  value={formatDateTime(issue.updatedAt)}
                />
                <DetailCardFact
                  label="Created"
                  value={formatDateTime(issue.createdAt)}
                />
              </DetailCardFacts>
            </DetailCardSection>
          </aside>

          {issue.labels && issue.labels.length > 0 ? (
            <div className="876-card p-4">
              <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
                <TagIcon className="size-3.5" />
                <span>Labels</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="px-2 py-0.5 text-xs"
                    style={
                      label.color ? { borderColor: label.color } : undefined
                    }
                  >
                    <span
                      className="mr-1.5 size-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                      aria-hidden="true"
                    />
                    {label.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
