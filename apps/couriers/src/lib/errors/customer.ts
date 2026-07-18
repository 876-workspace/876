import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const CUSTOMER_ERRORS = {
  'customer/not-found': {
    message: 'The requested customer was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorDef>

export type CustomerErrorCode = keyof typeof CUSTOMER_ERRORS
