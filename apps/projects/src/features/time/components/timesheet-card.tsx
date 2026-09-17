'use client'

import type { Timesheet } from '@876/projects/contracts'
import { TimesheetActions } from '@876/projects-ui/timesheet-actions'
import {
  TimesheetSummary,
  type TimesheetSummaryEntry,
} from '@876/projects-ui/timesheet-summary'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { ClientResult } from '@/types/client'
import { timeClient } from '@/lib/client/time'

import { toApprovalStatus } from './time-entry-rows'

type Props = {
  timesheet: Timesheet
  entries: readonly TimesheetSummaryEntry[]
  isOwner: boolean
  canApprove: boolean
  /** Resolved display names — the API carries user ids, the summary shows people. */
  submittedBy?: string | null
  decidedBy?: string | null
  groupBy?: 'project' | 'day'
}

/**
 * One timesheet: what it covers, and the transitions the viewer may make on it.
 *
 * Whether a transition is legal is the service's decision — this only offers
 * the verbs, and renders the refusal it answers with.
 */
export function TimesheetCard({
  timesheet,
  entries,
  isOwner,
  canApprove,
  submittedBy = null,
  decidedBy = null,
  groupBy = 'project',
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const status = toApprovalStatus(timesheet.status)

  async function run(
    action: () => Promise<ClientResult<unknown>>,
    fallback: string
  ) {
    if (pending) return

    setPending(true)
    setError(null)
    const result = await action()
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/timesheet-update-failed',
          message: fallback,
        }
      )
      return
    }

    router.refresh()
  }

  function submit() {
    return run(
      () => timeClient.submitTimesheet(timesheet.id),
      'The timesheet could not be submitted.'
    )
  }

  return (
    <div className="space-y-3">
      {error ? (
        <AppError
          title="The timesheet was not updated"
          error={error}
          variant="banner"
        />
      ) : null}

      <TimesheetSummary
        periodStart={timesheet.periodStart}
        periodEnd={timesheet.periodEnd}
        status={status}
        submittedAt={timesheet.submittedAt}
        submittedBy={submittedBy}
        decidedAt={timesheet.decidedAt}
        decidedBy={decidedBy}
        entries={entries}
        groupBy={groupBy}
      />

      <TimesheetActions
        status={status}
        isOwner={isOwner}
        canApprove={canApprove}
        onSubmit={submit}
        onRecall={() =>
          run(
            () => timeClient.recallTimesheet(timesheet.id),
            'The timesheet could not be recalled.'
          )
        }
        onApprove={() =>
          run(
            () => timeClient.approveTimesheet(timesheet.id),
            'The timesheet could not be approved.'
          )
        }
        onReject={(note) =>
          run(
            () => timeClient.rejectTimesheet(timesheet.id, note),
            'The timesheet could not be rejected.'
          )
        }
      />

      {/* A rejected sheet is submittable again, which the shared actions do not offer. */}
      {status === 'rejected' && isOwner ? (
        <div className="flex items-center gap-2">
          <Button variant="info" size="sm" disabled={pending} onClick={submit}>
            Resubmit
          </Button>
        </div>
      ) : null}
    </div>
  )
}
