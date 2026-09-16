'use client'

import type { TimeEntry } from '@876/projects/contracts'
import {
  TimeEntryList,
  type TimeEntryListRow,
} from '@876/projects-ui/time-entry-list'
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
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { timeClient } from '@/lib/client/time'

import { TimeEntryForm, type TimeEntryProjectOption } from './time-entry-form'

type Props = {
  rows: readonly TimeEntryListRow[]
  projects: readonly TimeEntryProjectOption[]
  /** The page without `?entry=`, so the form can open and close on the URL. */
  baseHref: string
  defaultDate: string
  /** Set when the page is about one project: the form offers no project picker. */
  projectId?: string | null
  canEdit: boolean
  createOpen: boolean
  editingEntry: TimeEntry | null
  emptyTitle: string
}

function withEntryParam(baseHref: string, value: string): string {
  const separator = baseHref.includes('?') ? '&' : '?'

  return `${baseHref}${separator}entry=${encodeURIComponent(value)}`
}

/**
 * The entry table and its two editors: the inline form, and a confirmation for
 * the only destructive action. Both live on the URL, so a reload reopens what
 * the user was doing.
 */
export function TimeEntriesPanel({
  rows,
  projects,
  baseHref,
  defaultDate,
  projectId = null,
  canEdit,
  createOpen,
  editingEntry,
  emptyTitle,
}: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<TimeEntryListRow | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function confirmDelete() {
    if (!deleting || pending) return

    setPending(true)
    setError(null)
    const result = await timeClient.deleteEntry(deleting.id)
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/time-entry-delete-failed',
          message: 'The entry could not be deleted.',
        }
      )
      return
    }

    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {canEdit && (createOpen || editingEntry) ? (
        <TimeEntryForm
          key={editingEntry?.id ?? 'new'}
          projects={projects}
          projectId={projectId}
          defaultDate={defaultDate}
          closeHref={baseHref}
          entry={editingEntry}
        />
      ) : null}

      <TimeEntryList
        entries={rows}
        issuesBaseHref="/issues"
        canEdit={canEdit}
        onEdit={(row) => router.push(withEntryParam(baseHref, row.id))}
        onDelete={(row) => {
          setError(null)
          setDeleting(row)
        }}
        emptyTitle={emptyTitle}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (open) return
          setDeleting(null)
          setError(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry</AlertDialogTitle>
            <AlertDialogDescription>
              The logged time will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <AppError
              title="The entry could not be deleted"
              error={error}
              variant="form"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={confirmDelete}
            >
              {pending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
