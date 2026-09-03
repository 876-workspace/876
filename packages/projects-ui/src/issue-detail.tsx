'use client'

import Link from 'next/link'
import type { Comment, Issue, IssueEvent } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  ArrowLeft,
  Calendar,
  ChatBubbleLeftIcon,
  Clock,
  Folder,
  TagIcon,
  User,
} from '@876/ui/icons'

import { IssuePriorityBadge } from './priority-badges'
import { IssueStatusBadge } from './status-badges'

export type IssueDetailProps = {
  issue: Issue
  comments?: readonly Comment[]
  events?: readonly IssueEvent[]
  issuesHref: string
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
  comments = [],
  events = [],
  issuesHref,
  projectHref,
}: IssueDetailProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={issuesHref}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'mb-4 inline-flex items-center gap-1.5',
          })}
        >
          <ArrowLeft className="size-3.5" />
          Back to issues
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-info">
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
          <div className="876-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
            <div className="mt-2 text-sm whitespace-pre-wrap text-foreground/90">
              {issue.description || 'No description provided.'}
            </div>
          </div>

          {/* Comments section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ChatBubbleLeftIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                Comments ({comments.length})
              </h2>
            </div>

            {comments.length === 0 ? (
              <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
                No comments yet
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="876-card p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {comment.authorUserId ?? 'Unknown'}
                      </span>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-foreground/90">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Events timeline */}
          {events.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Activity</h2>
              </div>
              <ul className="divide-border/60 divide-y rounded-lg border text-xs">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">
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
              <span className="text-xs text-muted-foreground">Project</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                <Folder className="size-4 text-muted-foreground" />
                {projectHref ? (
                  <Link
                    href={projectHref}
                    className="text-sky-600 hover:underline dark:text-sky-400 font-mono text-xs"
                  >
                    {issue.projectKey}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">{issue.projectKey}</span>
                )}
              </div>
            </div>

            <div className="py-3">
              <span className="text-xs text-muted-foreground">Assignee</span>
              <div className="mt-1 flex items-center gap-1.5 text-sm">
                <User className="size-4 text-muted-foreground" />
                <span className="font-mono text-xs">
                  {issue.assigneeUserId ?? 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="py-3">
              <span className="text-xs text-muted-foreground">Due Date</span>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-4 text-muted-foreground" />
                {formatDate(issue.dueDate)}
              </div>
            </div>

            <div className="py-3">
              <span className="text-xs text-muted-foreground">Estimate</span>
              <div className="mt-1 text-sm font-medium">
                {issue.estimate !== null ? `${issue.estimate} pts` : '—'}
              </div>
            </div>

            <div className="pt-3">
              <span className="text-xs text-muted-foreground">Created</span>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDate(issue.createdAt)}
              </div>
            </div>
          </div>

          {/* Labels section */}
          {issue.labels && issue.labels.length > 0 ? (
            <div className="876-card p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <TagIcon className="size-3.5" />
                <span>Labels</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="px-2 py-0.5 text-xs"
                    style={label.color ? { borderColor: label.color } : undefined}
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
