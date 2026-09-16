/**
 * The HTTP status a time-tracking service failure answers with.
 *
 * The time module returns `{ data, error }` values whose codes are stable, so
 * the mapping lives in one place rather than being restated per route — a code
 * the module grows later degrades to 400 rather than to a wrong specific.
 */
const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  'projects/project-not-found': 404,
  'projects/time-entry-not-found': 404,
  'projects/time-entry-forbidden': 403,
  'projects/time-entry-locked': 409,
  'projects/timer-not-found': 404,
  'projects/timesheet-not-found': 404,
  'projects/timesheet-forbidden': 403,
  'projects/timesheet-transition-invalid': 409,
  'projects/timesheet-self-approval': 403,
  'projects/timesheet-note-required': 422,
}

export function timeErrorStatus(code: string): number {
  return STATUS_BY_CODE[code] ?? 400
}
