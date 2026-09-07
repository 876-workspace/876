import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Billing-owned public errors that cross package/app boundaries.
 *
 * Keep provider transport details out of these definitions. Provider adapters
 * normalize vendor responses into these stable application contracts.
 */
export const BILLING_ERRORS = {
  'billing/accounting-connection-inactive': {
    message: 'The accounting provider connection is not active.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/accounting-dependency-pending': {
    message: 'An accounting provider dependency has not synchronized yet.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/accounting-projection-invalid': {
    message:
      'The Billing resource cannot be projected to the accounting provider.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/accounting-provider-adoption-not-found': {
    message: 'The accounting provider adoption was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/accounting-provider-connection-not-found': {
    message: 'The accounting provider connection was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/accounting-provider-local-resource-not-found': {
    message: 'The selected Billing resource was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/accounting-provider-not-configured': {
    message: 'The accounting provider integration is not configured.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'billing/accounting-provider-not-found': {
    message: 'The accounting provider was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/accounting-provider-resource-already-adopted': {
    message:
      'This provider resource is already mapped to another Billing resource.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/accounting-provider-unsupported': {
    message: 'This accounting provider is not available yet.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/item-insufficient-stock': {
    message: 'The requested item quantity is greater than the stock available.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/item-stock-not-tracked': {
    message: 'Stock tracking is not enabled for this item.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/oauth-invalid-state': {
    message:
      'The accounting provider authorization state is invalid or expired.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'billing/provider-authentication-failed': {
    message: 'The accounting provider rejected the authorization request.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'billing/provider-authorization-required': {
    message: 'The accounting provider authorization must be renewed.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/provider-invalid-domain': {
    message: 'The accounting provider data center is not supported.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/provider-invalid-request': {
    message: 'The accounting provider rejected the request.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/provider-invalid-response': {
    message: 'The accounting provider returned an unexpected response.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'billing/provider-offline-authorization-required': {
    message:
      'The accounting provider did not grant offline access. Reconnect and approve consent.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/provider-organization-not-found': {
    message:
      'The configured accounting provider organization is not available.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/provider-rate-limited': {
    message: 'The accounting provider rate limited the request.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
  },
  'billing/provider-resource-not-found': {
    message: 'The mapped accounting provider resource was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/provider-unavailable': {
    message: 'The accounting provider is temporarily unavailable.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'billing/quote-invalid-state': {
    message: 'This quote cannot be changed from its current status.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/workspace-not-found': {
    message: 'The Billing workspace was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/writer-inactive': {
    message: 'The Billing API is not the active writer.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
} as const satisfies Record<string, ErrorDef>

export type BillingErrorCode = keyof typeof BILLING_ERRORS
