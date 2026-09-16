/**
 * The single error-code → HTTP status table for the Projects app.
 *
 * The Projects service returns `{ data, error }` values whose codes are stable,
 * so the mapping lives in one place rather than being restated per route — a
 * code the service grows later degrades to 400 rather than to a wrong specific.
 * Explicit entries keep their current status; any other `*-not-found` code
 * answers 404; anything unknown answers 400.
 *
 * `storage/route-not-found` is explicitly 500: it means this app's own route
 * key is wrong, which is a server fault and not the caller's, so the explicit
 * entry wins over the `*-not-found` rule.
 */
const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  'projects/project-not-found': 404,
  'projects/tenant-not-found': 404,
  'projects/time-entry-not-found': 404,
  'projects/time-entry-forbidden': 403,
  'projects/time-entry-locked': 409,
  'projects/timer-not-found': 404,
  'projects/timesheet-not-found': 404,
  'projects/timesheet-forbidden': 403,
  'projects/timesheet-transition-invalid': 409,
  'projects/timesheet-self-approval': 403,
  'projects/timesheet-note-required': 422,
  'projects/capacity-not-found': 404,
  'projects/capacity-overlap': 409,
  'projects/invalid-period': 422,
  'projects/invalid-request': 422,
  'projects/not-configured': 503,
  'projects/template-not-found': 404,
  'projects/template-key-taken': 409,
  'projects/project-key-taken': 409,
  'projects/invalid-template-key': 422,
  'projects/invalid-project-key': 422,
  'projects/invalid-template-definition': 422,
  'projects/template-missing-references': 422,
  'projects/template-dependency-cycle': 422,
  'projects/task-list-not-found': 404,
  'projects/milestone-not-found': 404,
  'projects/issue-not-found': 404,
  'projects/issue-relation-exists': 409,
  'projects/issue-relation-not-found': 404,
  'projects/issue-dependency-exists': 409,
  'projects/issue-dependency-cycle': 422,
  'projects/issue-dependency-not-found': 404,
  'projects/comment-not-found': 404,
  'storage/upload-not-found': 404,
  'storage/file-not-found': 404,
  'storage/resource-link-not-found': 404,
  'storage/upload-incomplete': 409,
  'storage/upload-expired': 409,
  'storage/upload-verification-failed': 409,
  'storage/file-not-ready': 409,
  'storage/file-too-large': 413,
  'storage/mime-not-allowed': 415,
  'storage/forbidden': 403,
  'storage/not-configured': 502,
  'storage/unauthorized': 502,
  'storage/provider-error': 502,
  'storage/route-not-found': 500,
}

export function projectsErrorStatus(code: string): number {
  const status = STATUS_BY_CODE[code]
  if (status !== undefined) return status
  if (code.endsWith('-not-found')) return 404
  return 400
}
