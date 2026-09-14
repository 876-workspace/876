import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/** Transport-level errors shared by HTTP APIs. */
export const GENERIC_ERRORS = {
  'error/bad-request': {
    message: 'The request was invalid or malformed.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'error/conflict': {
    message: 'The request conflicts with the current resource state.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'error/not-found': {
    message: 'The requested resource was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'error/rate-limited': {
    message: 'Too many requests were made. Please try again later.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
  },
  'error/unavailable': {
    message: 'The service is temporarily unavailable. Please try again.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'error/unknown': {
    message: 'An unexpected error occurred. Please try again.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'provider/error': {
    message: 'An upstream service returned an error. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
} as const satisfies Record<string, ErrorDef>
