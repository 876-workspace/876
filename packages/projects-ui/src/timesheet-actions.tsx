'use client'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { useState } from 'react'

import type { TimesheetApprovalStatus } from './time-tracking'

export type TimesheetActionsProps = {
  status: TimesheetApprovalStatus
  isOwner: boolean
  canApprove: boolean
  onSubmit: () => void
  onApprove: () => void
  onReject: (note: string) => void
  onRecall: () => void
}

export function TimesheetActions({
  status,
  isOwner,
  canApprove,
  onSubmit,
  onApprove,
  onReject,
  onRecall,
}: TimesheetActionsProps) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  const canSubmit = status === 'draft' && isOwner
  const canRecall = status === 'submitted' && isOwner
  const canDecide = status === 'submitted' && canApprove && !isOwner

  if (rejecting && canDecide)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Rejection note"
          placeholder="Reason for rejection"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="h-8 w-64"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRejecting(false)
            setNote('')
          }}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={note.trim().length === 0}
          onClick={() => onReject(note.trim())}
        >
          Reject
        </Button>
      </div>
    )

  if (!canSubmit && !canRecall && !canDecide) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSubmit ? (
        <Button variant="info" size="sm" onClick={onSubmit}>
          Submit
        </Button>
      ) : null}
      {canRecall ? (
        <Button variant="outline" size="sm" onClick={onRecall}>
          Recall
        </Button>
      ) : null}
      {canDecide ? (
        <>
          <Button variant="info" size="sm" onClick={onApprove}>
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRejecting(true)}
          >
            Reject
          </Button>
        </>
      ) : null}
    </div>
  )
}
