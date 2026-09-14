import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const CUSTOMER_ERRORS = {
  'customer/not-found': {
    message: 'The requested customer was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'customer/registry-unavailable': {
    message: 'The customer registry is unavailable. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'customer/mailbox-unavailable': {
    message: 'A mailbox number could not be allocated. Please try again.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'customer/identity-locked': {
    message: "This customer's identity is managed by their 876 account.",
    httpStatus: HttpStatus.CONFLICT,
  },
  'customer/duplicate-email': {
    message: 'A customer with that email already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'customer/already-exists': {
    message: 'This party is already a Couriers customer.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'customer/creation-paused': {
    message: 'Customer creation is currently paused.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
} as const satisfies Record<string, ErrorDef>

export type CustomerErrorCode = keyof typeof CUSTOMER_ERRORS
