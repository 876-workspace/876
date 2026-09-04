import Link from 'next/link'
import type { Issue, IssueEvent } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { Markdown } from '@876/ui/markdown'
import { Calendar, Clock, Folder, TagIcon, User } from '@876/ui/icons'

import { IssuePriorityBadge } from './priority-badges'
import { IssueStatusBadge } from './status-badges'

export type IssueDetailProps = {
  issue: Issue
  events?: readonly IssueEvent[]
  projectHref?: string
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
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
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-info flex items-center gap-2 font-mono text-sm font-semibold">
              {issue.identifier}
            </div>
            <h1 className="mt-1 text-xl font-bold">{issue.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <IssueStatusBadge status={issue.status} />
            <IssuePriorityBadge priority={issue.priority} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main description & activity */}
        <div className="space-y-6 lg:col-span-2">
          {issue.description ? (
            <Markdown content={issue.description} />
          ) : (
            <div className="text-muted-foreground text-sm">
              No description provided.
            </div>
          )}

          {/* Events timeline */}
          {events.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground size-4" />
                <h2 className="text-sm font-semibold">Activity</h2>
              </div>
              <ul className="divide-border/60 divide-y rounded-lg border text-xs">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono">
                        {event.actorUserId ?? 'System'}
                      </span>
                      <span>{event.type}</span>
                      {event.toValue ? (
                        <span className="text-muted-foreground">
                          &rarr; {event.toValue}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          <div className="876-card divide-border/60 divide-y p-4">
            <div className="pb-3">
              <span className="text-muted-foreground text-xs">Project</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                <Folder className="text-muted-foreground size-4" />
                {projectHref ? (
                  <Link
                    href={projectHref}
                    className="font-mono text-xs text-sky-600 hover:underline dark:text-sky-400"
                  >
                    {issue.projectKey}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">{issue.projectKey}</span>
                )}
              </div>
            </div>

            <div className="py-3">
              <span className="text-muted-foreground text-xs">Assignee</span>
              <div className="mt-1 flex items-center gap-1.5 text-sm">
                <User className="text-muted-foreground size-4" />
                <span className="font-mono text-xs">
                  {issue.assigneeUserId ?? 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="py-3">
              <span className="text-muted-foreground text-xs">Due Date</span>
              <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                <Calendar className="text-muted-foreground size-4" />
                {formatDate(issue.dueDate)}
              </div>
            </div>

            <div className="py-3">
              <span className="text-muted-foreground text-xs">Estimate</span>
              <div className="mt-1 text-sm font-medium">
                {issue.estimate !== null ? `${issue.estimate} pts` : '—'}
              </div>
            </div>

            <div className="pt-3">
              <span className="text-muted-foreground text-xs">Created</span>
              <div className="text-muted-foreground mt-1 text-xs">
                {formatDate(issue.createdAt)}
              </div>
            </div>
          </div>

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
