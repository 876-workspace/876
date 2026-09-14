import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/** Request-envelope errors shared by HTTP APIs. */
export const REQUEST_ERRORS = {
  'request/invalid': {
    message: 'The request is invalid. Please check the submitted values.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'request/invalid-json': {
    message: 'The request body is not valid JSON.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorDef>
