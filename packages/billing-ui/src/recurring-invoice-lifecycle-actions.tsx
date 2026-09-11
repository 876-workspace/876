'use client'

import { useState, useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'

import type { RecurringInvoiceStatus } from './document-status'

export interface RecurringInvoiceLifecycleActionResult {
  error: string | null
}

export interface RecurringInvoiceLifecycleActionsProps {
  status: RecurringInvoiceStatus
  generatedCount: number
  onPause?: () => Promise<RecurringInvoiceLifecycleActionResult>
  onResume?: () => Promise<RecurringInvoiceLifecycleActionResult>
  onStop?: () => Promise<RecurringInvoiceLifecycleActionResult>
  onDelete?: () => Promise<RecurringInvoiceLifecycleActionResult>
}

function runAction(
  action: () => Promise<RecurringInvoiceLifecycleActionResult>,
  startTransition: React.TransitionStartFunction,
  setError: (error: string | null) => void,
  onSuccess?: () => void
) {
  setError(null)
  startTransition(async () => {
    const result = await action()
    if (result.error) {
      setError(result.error)
      return
    }
    onSuccess?.()
  })
}

/** Shared pause/resume/stop/delete controls for a recurring invoice profile. */
export function RecurringInvoiceLifecycleActions({
  status,
  generatedCount,
  onPause,
  onResume,
  onStop,
  onDelete,
}: RecurringInvoiceLifecycleActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [stopOpen, setStopOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const showPause = status === 'active' && onPause !== undefined
  const showResume = status === 'paused' && onResume !== undefined
  const showStop =
    (status === 'active' || status === 'paused') && onStop !== undefined
  const showDelete = generatedCount === 0 && onDelete !== undefined

  if (!showPause && !showResume && !showStop && !showDelete) return null

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {showPause ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            runAction(onPause, startTransition, setError)
          }
        >
          {isPending ? 'Pausing...' : 'Pause'}
        </Button>
      ) : null}
      {showResume ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            runAction(onResume, startTransition, setError)
          }
        >
          {isPending ? 'Resuming...' : 'Resume'}
        </Button>
      ) : null}
      {showStop ? (
        <>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => setStopOpen(true)}
          >
            Stop
          </Button>
          <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Stop this schedule?</AlertDialogTitle>
                <AlertDialogDescription>
                  No further invoices will be generated. Generated invoices
                  are kept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error ? (
                <AppError
                  error={{ code: 'recurring-invoice/stop-failed', message: error }}
                  variant="form"
                />
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Keep schedule
                </AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    runAction(onStop, startTransition, setError, () =>
                      setStopOpen(false)
                    )
                  }
                >
                  {isPending ? 'Stopping...' : 'Stop schedule'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
      {showDelete ? (
        <>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                <AlertDialogDescription>
                  The profile and its template will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error ? (
                <AppError
                  error={{
                    code: 'recurring-invoice/delete-failed',
                    message: error,
                  }}
                  variant="form"
                />
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    runAction(onDelete, startTransition, setError, () =>
                      setDeleteOpen(false)
                    )
                  }
                >
                  {isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

      {error && !stopOpen && !deleteOpen ? (
        <p
          role="alert"
          className="text-destructive basis-full text-right text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
