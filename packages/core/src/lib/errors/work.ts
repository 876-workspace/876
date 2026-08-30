import { HttpStatus, type ErrorDef } from '../../types/errors'

/** Canonical errors for the shared Work service. */
export const WORK_ERRORS = {
  'work/internal': {
    message: 'Internal server error.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
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
  'work/reminder-not-found': {
    message: 'Reminder not found.',
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
