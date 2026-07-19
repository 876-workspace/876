import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const PORTAL_ERRORS = {
  'portal/billing-unavailable': {
    message: 'Billing is temporarily unavailable. Please try again.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'portal/mailbox-unavailable': {
    message: 'A mailbox could not be assigned. Please try again.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'portal/enrollment-failed': {
    message: 'Portal enrollment could not be completed. Please try again.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
} as const satisfies Record<string, ErrorDef>

export type PortalErrorCode = keyof typeof PORTAL_ERRORS
