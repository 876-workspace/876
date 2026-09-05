import Link from 'next/link'
import type { Issue, IssueEvent } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Markdown } from '@876/ui/markdown'
import { Clock, Folder, TagIcon } from '@876/ui/icons'

import { IssuePriorityBadge } from './priority-badges'
import { IssueStatusBadge } from './status-badges'

export type IssueDetailProps = {
  issue: Issue
  events?: readonly IssueEvent[]
  projectHref?: string
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'No date set'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function IssueDetail({
  issue,
  events = [],
  projectHref,
}: IssueDetailProps) {
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
                        <span className="text-foreground font-mono text-xs font-medium">
                          {event.actorUserId ?? 'System'}
                        </span>
                        <span className="text-muted-foreground">
                          {event.type}
                        </span>
                        {event.toValue ? (
                          <span className="text-muted-foreground">
                            &rarr; {event.toValue}
                          </span>
                        ) : null}
                      </div>
                      <time className="text-muted-foreground text-xs sm:text-right">
                        {formatDate(event.createdAt)}
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
                  value={issue.assigneeUserId ?? 'Not assigned'}
                  mono={Boolean(issue.assigneeUserId)}
                />
                <DetailCardFact
                  label="Due date"
                  value={formatDate(issue.dueDate)}
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
                  label="Created"
                  value={formatDate(issue.createdAt)}
                />
              </DetailCardFacts>
            </DetailCardSection>
          </aside>

          {/* Labels section */}
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
