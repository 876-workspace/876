'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { timeClient } from '@/lib/client/time'

import type { TimePeriod } from '@/types/time'

/**
 * Gathers the viewer's unsubmitted entries in the shown period into a sheet.
 *
 * Which entries are attachable is the service's decision; this only names the
 * period and renders whatever refusal comes back.
 */
export function TimesheetCreateButton({ period }: { period: TimePeriod }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function create() {
    if (pending) return

    setPending(true)
    setError(null)
    const result = await timeClient.createTimesheet({
      periodStart: period.from,
      periodEnd: period.to,
    })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/timesheet-create-failed',
          message: 'The timesheet could not be created.',
        }
      )
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-2">
      {error ? (
        <AppError
          title="The timesheet was not created"
          error={error}
          variant="form"
        />
      ) : null}
      <Button
        type="button"
        variant="info"
        size="sm"
        disabled={pending}
        onClick={create}
      >
        {pending ? 'Creating…' : 'Create for period'}
      </Button>
    </div>
  )
}
