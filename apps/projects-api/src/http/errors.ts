import type { HttpStatusCode } from '@876/core'

export const PROJECTS_ERRORS = {
  'projects/capture-not-found': {
    message: 'The capture could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/capture-already-promoted': {
    message: 'This capture has already been promoted.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/tenant-not-found': {
    message: 'This organization does not have a 876 Projects workspace.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/project-not-found': {
    message: 'The project could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/project-key-taken': {
    message: 'Another project already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/project-slug-taken': {
    message: 'Another project already uses that name.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/invalid-project-key': {
    message: 'A project key must be 2 to 10 uppercase letters or digits.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/issue-not-found': {
    message: 'The issue could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/development-link-not-found': {
    message: 'The development link could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/label-not-found': {
    message: 'The label could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/label-name-taken': {
    message: 'Another label already uses that name.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/work-item-type-not-found': {
    message: 'The work item type could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/work-item-type-key-taken': {
    message: 'Another work item type already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/work-item-type-in-use': {
    message: 'This work item type is still used by an issue.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/default-work-item-type-required': {
    message: 'A default work item type must remain configured.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/workflow-state-not-found': {
    message: 'The workflow state could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/workflow-state-key-taken': {
    message: 'Another workflow state already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/workflow-state-in-use': {
    message: 'This workflow state is still used by an issue.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/default-workflow-state-required': {
    message: 'A default workflow state must remain configured.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/workflow-state-required': {
    message: 'At least one workflow state must remain active.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/milestone-not-found': {
    message: 'The milestone could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/milestone-key-taken': {
    message: 'Another milestone in this project already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/task-list-not-found': {
    message: 'The task list could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/cycle-not-found': {
    message: 'The cycle could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/cycle-number-taken': {
    message: 'Another cycle already uses that number.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/custom-field-not-found': {
    message: 'The custom field could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/custom-field-key-taken': {
    message: 'Another custom field already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/custom-field-value-invalid': {
    message: 'The custom field value does not match the field type.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/custom-field-option-invalid': {
    message: 'The selected option is not declared for this custom field.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/required-custom-field-missing': {
    message: 'Complete all required custom fields.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/custom-module-not-found': {
    message: 'The custom module could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/custom-module-key-taken': {
    message: 'Another custom module already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/custom-module-key-immutable': {
    message: 'The custom module key cannot be changed after creation.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/custom-module-field-not-found': {
    message: 'The custom module field could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/custom-module-field-key-taken': {
    message: 'Another field in this module already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/custom-module-status-not-found': {
    message: 'The custom module status could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/custom-module-status-key-taken': {
    message: 'Another status in this module already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/custom-module-status-in-use': {
    message: 'This status is used by records and cannot be deleted.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/default-custom-module-status-required': {
    message: 'Each custom module requires exactly one default open status.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/custom-module-record-not-found': {
    message: 'The custom module record could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/custom-module-link-not-found': {
    message: 'The custom module link could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/custom-module-link-exists': {
    message: 'This link already exists.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/custom-module-link-invalid': {
    message: 'The link target is invalid.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/custom-module-forbidden': {
    message: 'Your role cannot access this custom module.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/dashboard-widget-not-found': {
    message: 'The dashboard widget could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/layout-not-found': {
    message: 'The layout could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/layout-required-fields': {
    message: 'The active layout requires additional fields.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/layout-field-disabled': {
    message: 'The active layout does not allow changing this field.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/template-not-found': {
    message: 'The project template could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/template-key-taken': {
    message: 'Another template already uses that key.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/invalid-template-key': {
    message: 'A template key must be kebab-case, starting with a letter.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/invalid-template-definition': {
    message: 'The template definition is invalid.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/template-missing-references': {
    message:
      'Some types, states, or labels in the template are missing from this workspace.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/template-dependency-cycle': {
    message: 'The template dependencies would create a scheduling cycle.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/preset-not-found': {
    message: 'The requested work structure preset could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/issue-relation-not-found': {
    message: 'The issue relation could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/issue-relation-exists': {
    message: 'These issues are already linked with that relation type.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/issue-dependency-not-found': {
    message: 'The issue dependency could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/issue-dependency-exists': {
    message: 'This dependency already exists.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/baseline-not-found': {
    message: 'The baseline could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/issue-dependency-cycle': {
    message: 'This dependency would create a scheduling cycle.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/issue-self-link': {
    message: 'An issue cannot be linked to itself.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/comment-not-found': {
    message: 'The comment could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/comment-not-owned': {
    message: 'You can only change your own comments.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/member-not-found': {
    message: 'That person is not a member of this project.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/member-exists': {
    message: 'That person is already a member of this project.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/invalid-request': {
    message: 'The request could not be processed.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/unauthorized': {
    message: 'This request is missing valid credentials.',
    httpStatus: 401 as HttpStatusCode,
  },
  'projects/forbidden': {
    message: 'This credential does not have permission for that operation.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/rate-limited': {
    message: 'Too many requests. Please slow down and try again.',
    httpStatus: 429 as HttpStatusCode,
  },
  'projects/integration-client-not-found': {
    message: 'The integration client could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/webhook-endpoint-not-found': {
    message: 'The webhook endpoint could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/webhook-delivery-not-found': {
    message: 'The webhook delivery could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/webhook-url-blocked': {
    message: 'That webhook URL is not allowed.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/import-job-not-found': {
    message: 'The import job could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/import-job-not-ready': {
    message: 'The import job is not ready for that operation.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/import-too-large': {
    message: 'The import payload exceeds the 5 MB limit.',
    httpStatus: 413 as HttpStatusCode,
  },
  'projects/import-parse-failed': {
    message: 'The import payload could not be parsed.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/internal-error': {
    message: 'Something went wrong. Please try again.',
    httpStatus: 500 as HttpStatusCode,
  },
  'projects/event-not-found': {
    message: 'The event could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/attendee-not-found': {
    message: 'That person is not attending this event.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/attendee-exists': {
    message: 'That person is already attending this event.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/reminder-not-found': {
    message: 'The reminder could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/reminder-forbidden': {
    message: 'You can only view or change your own reminders.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/time-entry-not-found': {
    message: 'The time entry could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/timer-not-found': {
    message: 'There is no running timer for this user.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/time-entry-forbidden': {
    message: 'You can only change your own time entries.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/time-entry-locked': {
    message: 'This time entry is locked by its timesheet.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/timesheet-not-found': {
    message: 'The timesheet could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/timesheet-forbidden': {
    message: 'Only the timesheet owner can perform this action.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/timesheet-self-approval': {
    message: 'The submitter cannot approve their own timesheet.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/timesheet-note-required': {
    message: 'A note is required to reject a timesheet.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/timesheet-transition-invalid': {
    message: 'This timesheet cannot move from its current status.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/billing-config-not-found': {
    message: 'The billing configuration for this project could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/budget-not-found': {
    message: 'The budget could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/rate-not-found': {
    message: 'The rate could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/invoice-customer-missing': {
    message:
      'Configure a billing customer for this project before drafting an invoice.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/nothing-to-invoice': {
    message:
      'There are no approved, unbilled, billable time entries in this period.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/invoice-has-unpriced-entries': {
    message: 'Some entries have no matching rate and cannot be priced.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/entries-already-billed': {
    message: 'These entries were already billed under different invoices.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/billing-unavailable': {
    message: 'The billing service could not create the invoice draft.',
    httpStatus: 502 as HttpStatusCode,
  },
  'projects/capacity-not-found': {
    message: 'The member capacity could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/capacity-overlap': {
    message: 'This member already has capacity covering that period.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/invalid-period': {
    message: 'The report period is invalid. The end must be after the start.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/transition-not-allowed': {
    message: 'This state change is not allowed by the workflow blueprint.',
    httpStatus: 422 as HttpStatusCode,
  },
  'projects/transition-requirements-unmet': {
    message:
      'This transition requires additional fields, a comment, or a permission.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/automation-rule-not-found': {
    message: 'The automation rule could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/automation-subject-not-found': {
    message: 'The automation subject could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/notification-not-found': {
    message: 'The notification could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/discussion-not-found': {
    message: 'The discussion could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/discussion-post-not-found': {
    message: 'The discussion post could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/discussion-locked': {
    message: 'This discussion is locked and no longer accepts posts.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/discussion-post-forbidden': {
    message: 'Only the post author can change this post.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/wiki-page-not-found': {
    message: 'The wiki page could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/wiki-page-slug-taken': {
    message: 'Another page in this project already uses that slug.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/wiki-revision-not-found': {
    message: 'The wiki revision could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/wiki-invalid-parent': {
    message: 'A page cannot be its own ancestor.',
    httpStatus: 400 as HttpStatusCode,
  },
  'projects/attachment-link-not-found': {
    message: 'The attachment link could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/client-grant-not-found': {
    message: 'This project is not shared with that user.',
    httpStatus: 404 as HttpStatusCode,
  },
  'projects/client-grant-exists': {
    message: 'This project is already shared with that user.',
    httpStatus: 409 as HttpStatusCode,
  },
  'projects/portal-forbidden': {
    message: 'This shared project does not include that section.',
    httpStatus: 403 as HttpStatusCode,
  },
  'projects/not-found': {
    message: 'Not found.',
    httpStatus: 404 as HttpStatusCode,
  },
} as const satisfies Record<
  string,
  { message: string; httpStatus: HttpStatusCode }
>

export type ProjectsErrorCode = keyof typeof PROJECTS_ERRORS

export type ProjectsError = {
  code: ProjectsErrorCode
  message: string
  httpStatus: HttpStatusCode
  description?: string
  param?: string
}

export type ErrorOptions = {
  param?: string
  description?: string
}

export function getError(
  code: ProjectsErrorCode,
  options?: ErrorOptions
): ProjectsError {
  const definition = PROJECTS_ERRORS[code]
  return {
    code,
    message: definition.message,
    httpStatus: definition.httpStatus,
    ...(options?.param ? { param: options.param } : {}),
    ...(options?.description ? { description: options.description } : {}),
  }
}

export function projectsError(
  code: ProjectsErrorCode,
  options?: ErrorOptions
): ProjectsError {
  return getError(code, options)
}

export function isProjectsError(value: unknown): value is ProjectsError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    'message' in value &&
    typeof (value as Record<string, unknown>).message === 'string' &&
    'httpStatus' in value &&
    typeof (value as Record<string, unknown>).httpStatus === 'number'
  )
}
