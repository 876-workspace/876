'use client'

import type {
  TaskList,
  WorkBreakdown,
  WorkBreakdownIssue,
  WorkBreakdownTaskList,
} from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { ChevronDown, ChevronUp, Pencil } from '@876/ui/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { formatDate } from '@876/projects-ui/format-date'
import { taskListsClient } from '@/lib/client'

type Props = {
  breakdown: WorkBreakdown
  ownerLabels: Readonly<Record<string, string>>
  canEdit: boolean
}

type BreakdownGroup = {
  key: string
  label: string
  taskLists: WorkBreakdownTaskList[]
  unlistedIssues: WorkBreakdownIssue[]
}

function groupGroups(breakdown: WorkBreakdown): BreakdownGroup[] {
  return [
    ...breakdown.phases.map((phase) => ({
      key: phase.milestone.id,
      label: phase.milestone.name,
      taskLists: phase.taskLists,
      unlistedIssues: phase.unlistedIssues,
    })),
    {
      key: 'no-phase',
      label: 'No phase',
      taskLists: breakdown.unphasedTaskLists,
      unlistedIssues: [],
    },
    {
      key: 'unlisted',
      label: 'Unlisted',
      taskLists: [],
      unlistedIssues: breakdown.unlistedIssues,
    },
  ]
}

function dateRange(taskList: TaskList) {
  const start = taskList.startDate ? formatDate(taskList.startDate) : null
  const target = taskList.targetDate ? formatDate(taskList.targetDate) : null
  if (start && target) return `${start} → ${target}`
  return start ?? target
}

function issueHref(issue: WorkBreakdownIssue) {
  return `/issues/${encodeURIComponent(issue.identifier)}`
}

export function WorkBreakdown({ breakdown, ownerLabels, canEdit }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState(() => groupGroups(breakdown))
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const hasContent = useMemo(
    () =>
      groups.some(
        (group) => group.taskLists.length > 0 || group.unlistedIssues.length > 0
      ),
    [groups]
  )
  const hasTaskListStructure = groups.some((group) =>
    group.taskLists.some((item) => item.issues.length > 0)
  )

  async function move(groupKey: string, index: number, direction: -1 | 1) {
    const group = groups.find((candidate) => candidate.key === groupKey)
    if (!group) return
    const target = index + direction
    const moved = group.taskLists[index]
    if (!moved || target < 0 || target >= group.taskLists.length) return

    const nextLists = [...group.taskLists]
    nextLists.splice(index, 1)
    nextLists.splice(target, 0, moved)
    const previous = groups
    setError(null)
    setGroups(
      groups.map((candidate) =>
        candidate.key === groupKey
          ? { ...candidate, taskLists: nextLists }
          : candidate
      )
    )

    const result = await taskListsClient.reorder(
      breakdown.projectId,
      nextLists.map((item) => item.taskList.id)
    )
    if (result.error || !result.data) {
      setGroups(previous)
      setError(
        result.error ?? {
          code: 'projects/task-list-reorder-failed',
          message: 'The task list order could not be saved.',
        }
      )
      return
    }

    router.refresh()
  }

  async function toggleArchived(taskList: TaskList) {
    setPendingId(taskList.id)
    setError(null)
    const result = taskList.archivedAt
      ? await taskListsClient.restore(taskList.id)
      : await taskListsClient.archive(taskList.id)
    setPendingId(null)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/task-list-archive-failed',
          message: 'The task list could not be updated.',
        }
      )
      return
    }

    router.refresh()
  }

  return (
    <>
      {hasTaskListStructure ? (
        <section
          data-testid="mobile-work-breakdown"
          className="space-y-5 sm:hidden"
        >
          <h2 className="876-section-title">Work breakdown</h2>
          {groups.map((group) => {
            if (
              group.taskLists.length === 0 &&
              group.unlistedIssues.length === 0
            )
              return null

            return (
              <div key={group.key} className="space-y-3">
                <h3 className="text-sm font-medium">{group.label}</h3>
                {group.taskLists.map((item) => (
                  <div key={item.taskList.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-0">
                      <span className="text-[0.9375rem] font-medium">
                        {item.taskList.name}
                      </span>
                      {item.taskList.archivedAt ? (
                        <Badge variant="secondary">Archived</Badge>
                      ) : null}
                    </div>
                    {item.issues.length > 0 ? (
                      <ul className="-mx-4">
                        {item.issues.map((issue) => (
                          <li key={issue.id}>
                            <Link
                              href={issueHref(issue)}
                              className="border-border/60 active:bg-muted/70 flex gap-2 border-t px-4 py-3"
                            >
                              <span className="shrink-0 font-mono text-xs font-semibold">
                                {issue.identifier}
                              </span>{' '}
                              <span className="line-clamp-2 text-[0.9375rem] leading-5">
                                {issue.title}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
                {group.unlistedIssues.length > 0 ? (
                  <ul className="-mx-4">
                    {group.unlistedIssues.map((issue) => (
                      <li key={issue.id}>
                        <Link
                          href={issueHref(issue)}
                          className="border-border/60 active:bg-muted/70 flex gap-2 border-t px-4 py-3"
                        >
                          <span className="shrink-0 font-mono text-xs font-semibold">
                            {issue.identifier}
                          </span>{' '}
                          <span className="line-clamp-2 text-[0.9375rem] leading-5">
                            {issue.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </section>
      ) : null}

      <section
        data-testid="desktop-work-breakdown"
        className="876-card hidden space-y-4 p-4 sm:block"
      >
        <h2 className="876-section-title">Work breakdown</h2>

        {error ? (
          <AppError
            title="The work breakdown could not be updated"
            error={error}
            variant="banner"
          />
        ) : null}

        {!hasContent ? (
          <p className="text-muted-foreground text-sm">
            No task lists or work items yet.
          </p>
        ) : null}

        {groups.map((group) => {
          if (group.taskLists.length === 0 && group.unlistedIssues.length === 0)
            return null

          return (
            <div key={group.key} className="space-y-2">
              <h3 className="text-sm font-medium">{group.label}</h3>

              {group.taskLists.length > 0 ? (
                <ul className="space-y-2">
                  {group.taskLists.map((item, index) => (
                    <li
                      key={item.taskList.id}
                      className="border-border rounded-md border px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.taskList.name}
                            </span>
                            {item.taskList.archivedAt ? (
                              <Badge variant="secondary">Archived</Badge>
                            ) : null}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {[
                              item.taskList.ownerUserId
                                ? (ownerLabels[item.taskList.ownerUserId] ??
                                  item.taskList.ownerUserId)
                                : null,
                              dateRange(item.taskList),
                              `${item.taskList.progress.completed}/${item.taskList.progress.total} complete`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>

                        {canEdit ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Move ${item.taskList.name} up`}
                              disabled={index === 0}
                              onClick={() => move(group.key, index, -1)}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Move ${item.taskList.name} down`}
                              disabled={index === group.taskLists.length - 1}
                              onClick={() => move(group.key, index, 1)}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                            <Link
                              href={`/task-lists/${encodeURIComponent(item.taskList.id)}/edit`}
                              className={buttonVariants({
                                variant: 'outline',
                                size: 'sm',
                              })}
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Link>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleArchived(item.taskList)}
                              disabled={pendingId === item.taskList.id}
                            >
                              {item.taskList.archivedAt ? 'Restore' : 'Archive'}
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      {item.issues.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {item.issues.map((issue) => (
                            <li key={issue.id}>
                              <Link
                                href={issueHref(issue)}
                                className="text-sm hover:underline"
                              >
                                {issue.identifier} — {issue.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {group.unlistedIssues.length > 0 ? (
                <ul className="space-y-1">
                  {group.unlistedIssues.map((issue) => (
                    <li key={issue.id}>
                      <Link
                        href={issueHref(issue)}
                        className="text-sm hover:underline"
                      >
                        {issue.identifier} — {issue.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
      </section>
    </>
  )
}
