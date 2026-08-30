import { HttpStatus, type ErrorDef } from '../../types/errors'

/** Canonical errors for the shared Work service. */
export const WORK_ERRORS = {
  'work/alert-not-found': {
    message: 'Alert not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/assignment-not-found': {
    message: 'Task assignment not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/calendar-not-found': {
    message: 'Calendar not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/calendar-primary-delete-forbidden': {
    message: 'A primary calendar cannot be deleted.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'work/calendar-subscription-not-found': {
    message: 'Calendar subscription not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/connection-forbidden': {
    message: 'The app Work connection lacks the required scope.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'work/event-not-found': {
    message: 'Event not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/event-participant-not-found': {
    message: 'Event participant not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/identity-unavailable': {
    message: 'The identity service could not verify access. Please retry.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'work/internal': {
    message: 'Internal server error.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'work/invalid-api-key': {
    message: 'The 876 app API key is invalid.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'work/invalid-request': {
    message: 'Invalid Work request.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'work/invalid-response': {
    message: 'Work API returned an invalid response.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'work/not-configured': {
    message: 'Work client is not configured.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'work/not-found': {
    message: 'Not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/recurrence-rule-not-found': {
    message: 'Recurrence rule not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/reminder-not-found': {
    message: 'Reminder not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/session-forbidden': {
    message: 'You do not have permission to perform this Work action.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'work/sync-connection-not-found': {
    message: 'Sync connection not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/sync-mapping-not-found': {
    message: 'Sync mapping not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/task-link-not-found': {
    message: 'Task link not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/task-list-not-found': {
    message: 'Task list not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/task-not-found': {
    message: 'Task not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/tenant-inactive': {
    message: 'This organization’s Work workspace is not active.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'work/tenant-not-found': {
    message: 'This organization has no Work workspace yet.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'work/unauthorized': {
    message: 'Unauthorized.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
} as const satisfies Record<string, ErrorDef>

export type WorkErrorCode = keyof typeof WORK_ERRORS
