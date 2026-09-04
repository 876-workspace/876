import type { HttpStatusCode } from '@876/core'

export const PROJECTS_ERRORS = {
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
    message: 'The default workflow state cannot be deleted.',
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
  'projects/preset-not-found': {
    message: 'The requested work structure preset could not be found.',
    httpStatus: 404 as HttpStatusCode,
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
  'projects/internal-error': {
    message: 'Something went wrong. Please try again.',
    httpStatus: 500 as HttpStatusCode,
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
