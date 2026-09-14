import type { ErrorDef } from '@876/core'
import { BILLING_ERRORS, HttpStatus } from '@876/core'

/** The finance settings resource a failed call belongs to. */
export type FinanceResource = 'tax' | 'currency' | 'payment-mode'

/**
 * Couriers finance-settings errors (taxes, currencies, payment modes).
 *
 * These back the Couriers `/api/manage/finance/*` routes and the Finance
 * settings page. Billing-owned failure codes are reused from `@876/core`
 * rather than redefined here.
 */
export const FINANCE_ERRORS = {
  'finance/unauthorized': {
    message: 'You must sign in to manage finance settings.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'finance/forbidden': {
    message: 'You do not have permission to manage finance settings.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'finance/invalid-tax': {
    message: 'The tax details are invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'finance/invalid-payment-mode': {
    message: 'The payment mode details are invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'finance/payment-mode-not-found': {
    message: 'The payment mode was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'finance/payment-mode-image-upload-failed': {
    message: 'The payment mode image could not be uploaded. Please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'finance/payment-mode-image-mismatch': {
    message: 'The uploaded image does not belong to this payment mode.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'finance/payment-mode-image-attach-failed': {
    message:
      'The image was uploaded but could not be attached. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'finance/invalid-currency': {
    message: 'The currency details are invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'finance/tax-unavailable': {
    message: 'Tax settings are unavailable right now. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'finance/payment-mode-unavailable': {
    message:
      'Payment mode settings are unavailable right now. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'finance/currency-unavailable': {
    message: 'Currency settings are unavailable right now. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
} as const satisfies Record<string, ErrorDef>

export type FinanceErrorCode = keyof typeof FINANCE_ERRORS

/** Registered code returned when a finance resource cannot be reached. */
export const FINANCE_UNAVAILABLE_CODE: Record<FinanceResource, string> = {
  tax: 'finance/tax-unavailable',
  currency: 'finance/currency-unavailable',
  'payment-mode': 'finance/payment-mode-unavailable',
}

/**
 * Normalizes a failure code from the Billing integration boundary into a
 * registered public code: finance and Billing codes pass through, everything
 * else collapses to the owning resource's unavailable code.
 */
export function resolveFinanceErrorCode(
  resource: FinanceResource,
  code: string
): string {
  if (code in FINANCE_ERRORS) return code
  if (code in BILLING_ERRORS) return code
  return FINANCE_UNAVAILABLE_CODE[resource]
}
