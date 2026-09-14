import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const MAILBOX_ERRORS = {
  'mailbox/allocation-exhausted': {
    message: 'No mailbox number is available. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'mailbox/not-found': {
    message: 'The requested mailbox was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorDef>
