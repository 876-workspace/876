'use client'

import type { Issue } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { issuesClient } from '@/lib/client'

export type BoardStatusOption = { key: string; label: string }

type Props = {
  issues: Issue[]
  states: readonly BoardStatusOption[]
  issuesHref: string
  userLabels?: Readonly<Record<string, string>>
}

type FailedMove = {
  issueId: string
  identifier: string
  title: string
  toStatus: string
}

function transitionMessage(code: string, message: string): string {
  if (code === 'projects/transition-requirements-unmet')
    return `${message} Add the missing details — or leave a comment — then retry.`
  return message
}

export function BoardDragBoard({
  issues,
  states,
  issuesHref,
  userLabels = {},
}: Props) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [needsComment, setNeedsComment] = useState(false)
  const [failedMove, setFailedMove] = useState<FailedMove | null>(null)

  const columns = states.map((state) => ({
    state,
    issues: issues.filter((issue) => issue.status === state.key),
  }))
  const orphaned = issues.filter(
    (issue) => !states.some((state) => state.key === issue.status)
  )

  async function requestMove(
    issue: Issue,
    toStatus: string,
    withComment?: string
  ) {
    if (pendingId || toStatus === issue.status) return
    setPendingId(issue.id)
    setError(null)
    const result = await issuesClient.update(issue.identifier, {
      status: toStatus,
      ...(withComment && withComment.trim() !== ''
        ? { comment: withComment.trim() }
        : {}),
    })
    setPendingId(null)
    if (result.error || !result.data) {
      const code = result.error?.code ?? 'projects/status-change-failed'
      setError({
        code,
        message: transitionMessage(
          code,
          result.error?.message ?? 'The status could not be changed.'
        ),
      })
      setNeedsComment(code === 'projects/transition-requirements-unmet')
      setFailedMove({
        issueId: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        toStatus,
      })
      return
    }
    setFailedMove(null)
    setComment('')
    setNeedsComment(false)
    router.refresh()
  }

  function cancelMove() {
    setFailedMove(null)
    setComment('')
    setError(null)
    setNeedsComment(false)
  }

  return (
    <div data-slot="board-drag-board" className="flex flex-col gap-3">
      {error && failedMove ? (
        <div className="flex flex-col gap-3">
          <AppError
            title={
              error.code === 'projects/transition-not-allowed'
                ? `Move to ${failedMove.toStatus} not allowed`
                : `“${failedMove.title}” not moved`
            }
            error={error}
            variant="form"
          />
          {needsComment ? (
            <div className="876-card flex flex-col gap-2 p-4">
              <Label htmlFor="board-move-comment">
                Comment (required by this transition)
              </Label>
              <Textarea
                id="board-move-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                placeholder="Explain why this state is changing"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pendingId !== null || comment.trim() === ''}
                  onClick={() => {
                    const issue = issues.find(
                      (entry) => entry.id === failedMove.issueId
                    )
                    if (issue) void requestMove(issue, failedMove.toStatus, comment)
                  }}
                >
                  Retry with comment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={cancelMove}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="hidden gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {columns.map(({ state, issues: columnIssues }) => (
          <div
            key={state.key}
            data-slot="board-drag-column"
            data-state={state.key}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const issueId = event.dataTransfer.getData('text/plain')
              const issue = issues.find((entry) => entry.id === issueId)
              if (issue) void requestMove(issue, state.key)
            }}
            className="bg-muted/40 flex min-w-0 flex-1 flex-col rounded-[1.375rem] p-2.5"
          >
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <h2 className="text-[0.9375rem] font-semibold tracking-tight">
                {state.label}
              </h2>
              <span className="text-muted-foreground text-[0.8125rem] tabular-nums">
                {columnIssues.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
              {columnIssues.length === 0 ? (
                <div className="text-muted-foreground/60 flex flex-1 items-center justify-center py-8 text-[0.8125rem]">
                  Drop issues here
                </div>
              ) : (
                columnIssues.map((issue) => (
                  <div
                    key={issue.id}
                    data-slot="board-drag-card"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', issue.id)
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    className="bg-card flex flex-col gap-1.5 rounded-2xl px-3.5 py-3"
                  >
                    <Link
                      href={`${issuesHref}/${issue.identifier}`}
                      className="text-[0.9375rem] leading-snug"
                      draggable={false}
                    >
                      {issue.title}
                    </Link>
                    <div className="text-muted-foreground flex items-center gap-2 text-[0.8125rem]">
                      <span className="shrink-0 tabular-nums">
                        {issue.identifier}
                      </span>
                      {issue.assigneeUserId ? (
                        <span className="ml-auto truncate text-xs">
                          {userLabels[issue.assigneeUserId] ??
                            issue.assigneeUserId}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor={`board-move-${issue.id}`}
                        className="sr-only"
                      >
                        Move {issue.identifier} to state
                      </Label>
                      <NativeSelect
                        id={`board-move-${issue.id}`}
                        aria-label={`Move ${issue.identifier} to state`}
                        value={issue.status}
                        disabled={pendingId === issue.id}
                        onChange={(event) =>
                          void requestMove(issue, event.target.value)
                        }
                        className="h-7 text-xs"
                      >
                        {states.map((option) => (
                          <NativeSelectOption
                            key={option.key}
                            value={option.key}
                          >
                            {option.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      {orphaned.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {orphaned.length} issue{orphaned.length === 1 ? '' : 's'} in an
          unknown state are not shown on the board.
        </p>
      ) : null}
    </div>
  )
}
