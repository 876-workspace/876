'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { issuesClient } from '@/lib/client'

export type IssueStatusOption = { key: string; label: string }

type Props = {
  issueRef: string
  currentStatus: string
  statuses: readonly IssueStatusOption[]
  canEdit: boolean
}

function transitionMessage(code: string, message: string): string {
  if (code === 'projects/transition-requirements-unmet')
    return `${message} Add the missing details — or leave a comment — then retry.`
  return message
}

export function IssueStatusSelect({
  issueRef,
  currentStatus,
  statuses,
  canEdit,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState(currentStatus)
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [needsComment, setNeedsComment] = useState(false)

  if (!canEdit) return null

  async function attemptMove(nextStatus: string, withComment?: string) {
    if (pending || nextStatus === currentStatus) return
    setPending(true)
    setError(null)
    const result = await issuesClient.update(issueRef, {
      status: nextStatus,
      ...(withComment && withComment.trim() !== ''
        ? { comment: withComment.trim() }
        : {}),
    })
    setPending(false)
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
      return
    }
    setSelected(nextStatus)
    setComment('')
    setNeedsComment(false)
    router.refresh()
  }

  function cancel() {
    setSelected(currentStatus)
    setComment('')
    setError(null)
    setNeedsComment(false)
  }

  return (
    <div
      data-slot="issue-status-select"
      className="876-card flex flex-col gap-3 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48">
          <Label htmlFor="issue-status">Status</Label>
          <NativeSelect
            id="issue-status"
            value={selected}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value
              setSelected(next)
              void attemptMove(next)
            }}
          >
            {statuses.map((status) => (
              <NativeSelectOption key={status.key} value={status.key}>
                {status.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {pending ? (
          <span role="status" className="text-muted-foreground pb-2 text-xs">
            Updating…
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="flex flex-col gap-3">
          <AppError
            title={
              error.code === 'projects/transition-not-allowed'
                ? 'Status change not allowed'
                : 'Status not changed'
            }
            error={error}
            variant="form"
          />
          {needsComment ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="issue-status-comment">
                Comment (required by this transition)
              </Label>
              <Textarea
                id="issue-status-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                placeholder="Explain why this state is changing"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || comment.trim() === ''}
                  onClick={() => void attemptMove(selected, comment)}
                >
                  Retry with comment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={cancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
