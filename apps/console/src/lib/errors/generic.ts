import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const GENERIC_ERRORS = {
  'error/unknown': {
    message: 'An unexpected error occurred. Please try again.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'error/not-found': {
    message: 'The requested resource was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'error/forbidden': {
    message: 'You do not have permission to access this resource.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'error/bad-request': {
    message: 'The request was invalid or malformed.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'error/validation-failed': {
    message: 'The provided data failed validation.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'error/network': {
    message: 'A network error occurred. Please check your connection.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
} as const satisfies Record<string, ErrorDef>

export type GenericErrorCode = keyof typeof GENERIC_ERRORS
