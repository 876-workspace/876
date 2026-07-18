import type { AppAssignmentErrorCode } from '../../types/app-assignments-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * App assignment-related error codes. Keep this registry sorted by code.
 */
export const APP_ASSIGNMENT_ERRORS = {
  'app-assignment/app-not-found': {
    message: 'App not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'app-assignment/member-not-found': {
    message: 'Member not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'app-assignment/not-found': {
    message: 'App assignment not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'app-assignment/not-provisioned': {
    message: 'This app has not been provisioned.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'app-assignment/validation-failed': {
    message: 'Please check the app assignment input and try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<AppAssignmentErrorCode, ErrorDef>
