import type { ErrorDef } from '@876/core'
import { BILLING_ERRORS, HttpStatus } from '@876/core'

export const ITEM_ERRORS = {
  'item/unauthorized': {
    message: 'You must sign in to manage items.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'item/forbidden': {
    message: 'You do not have permission to manage items.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'item/invalid': {
    message: 'The item details are invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'item/unavailable': {
    message: 'Items are unavailable right now. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
} as const satisfies Record<string, ErrorDef>

export function resolveItemErrorCode(code: string) {
  return code in ITEM_ERRORS || code in BILLING_ERRORS
    ? code
    : 'item/unavailable'
}
