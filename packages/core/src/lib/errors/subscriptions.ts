import type { SubscriptionErrorCode } from '../../types/subscriptions-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Subscription-related error codes. Keep this registry sorted by code.
 */
export const SUBSCRIPTION_ERRORS = {
  'subscription/app-required': {
    message: 'Provide app_id or app_slug.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'subscription/not-found': {
    message: 'Subscription not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'subscription/update-required': {
    message: 'Provide status, cancel_at_period_end, or price_id.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
} as const satisfies Record<SubscriptionErrorCode, ErrorDef>
