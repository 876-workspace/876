import type { AppAccessErrorCode } from '../../types/app-access-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/** App-access error codes. Keep this registry sorted by code. */
export const APP_ACCESS_ERRORS = {
  'app-access/internal-error': {
    message: 'App access could not be completed. Please try again.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'app-membership/app-not-assignable': {
    message: 'This app does not use app membership roles.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'app-membership/duplicate': {
    message: 'This member is already assigned to the app.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'app-membership/not-a-member': {
    message: 'The user is not an active member of this organization.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'app-membership/not-entitled': {
    message: 'This organization is not entitled to use the app.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'app-membership/not-found': {
    message: 'App membership not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'app-permission/duplicate': {
    message: 'This app permission is already registered.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'app-permission/not-found': {
    message: 'App permission not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'app-role/duplicate-key': {
    message: 'An app role with this key already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'app-role/in-use': {
    message: 'This app role is currently assigned to one or more members.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'app-role/last-admin': {
    message: 'The app must keep at least one active administrator.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'app-role/not-found': {
    message: 'App role not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'app-role/system-immutable': {
    message: 'This role is managed by 876 and cannot be changed.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'app-role/unknown-permission': {
    message: 'One or more app permissions are not registered for this app.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<AppAccessErrorCode, ErrorDef>
