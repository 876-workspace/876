'use client'

import type {
  Deleted,
  TimeEntry,
  TimerStartResult,
  TimesheetDetail,
} from '@876/projects/contracts'

import { request } from './request'

/**
 * What the browser may send when logging time.
 *
 * The actor is never part of a payload: every route resolves it from the sealed
 * session, and `durationMinutes` is derived by the service from the two
 * timestamps, so neither can be set from here.
 */
import type { CreateTimeEntryParams, UpdateTimeEntryParams } from '@/types/time'

function jsonInit(method: 'POST' | 'PATCH', payload?: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }
}

function entryRoot(timeEntryId: string) {
  return `/api/time-entries/${encodeURIComponent(timeEntryId)}`
}

function timesheetAction(timesheetId: string, action: string) {
  return `/api/timesheets/${encodeURIComponent(timesheetId)}/${action}`
}

export const timeClient = {
  createEntry(params: CreateTimeEntryParams) {
    return request<TimeEntry>('/api/time-entries', jsonInit('POST', params))
  },
  updateEntry(timeEntryId: string, params: UpdateTimeEntryParams) {
    return request<TimeEntry>(entryRoot(timeEntryId), jsonInit('PATCH', params))
  },
  deleteEntry(timeEntryId: string) {
    return request<Deleted>(entryRoot(timeEntryId), { method: 'DELETE' })
  },
  startTimer(params: { projectId: string }) {
    return request<TimerStartResult>(
      '/api/timer/start',
      jsonInit('POST', params)
    )
  },
  stopTimer() {
    return request<TimeEntry>('/api/timer/stop', jsonInit('POST'))
  },
  createTimesheet(params: {
    periodStart: number
    periodEnd: number
    note?: string | null
  }) {
    return request<TimesheetDetail>('/api/timesheets', jsonInit('POST', params))
  },
  submitTimesheet(timesheetId: string) {
    return request<TimesheetDetail>(
      timesheetAction(timesheetId, 'submit'),
      jsonInit('POST')
    )
  },
  recallTimesheet(timesheetId: string) {
    return request<TimesheetDetail>(
      timesheetAction(timesheetId, 'recall'),
      jsonInit('POST')
    )
  },
  approveTimesheet(timesheetId: string, note?: string | null) {
    return request<TimesheetDetail>(
      timesheetAction(timesheetId, 'approve'),
      jsonInit('POST', { note: note ?? null })
    )
  },
  rejectTimesheet(timesheetId: string, note: string) {
    return request<TimesheetDetail>(
      timesheetAction(timesheetId, 'reject'),
      jsonInit('POST', { note })
    )
  },
}
