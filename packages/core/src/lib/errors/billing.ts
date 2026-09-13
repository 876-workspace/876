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
  'billing/currency-mismatch': {
    message: 'The selected commercial resource uses a different currency.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/idempotency-conflict': {
    message: 'The idempotency key was already used for another command.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/idempotency-key-required': {
    message: 'A valid Idempotency-Key header is required.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'billing/item-insufficient-stock': {
    message: 'The requested item quantity is greater than the stock available.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/item-media-invalid-file': {
    message: 'The selected Storage file cannot be attached to this item.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/item-stock-not-tracked': {
    message: 'Stock tracking is not enabled for this item.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/item-stock-variant-required': {
    message: 'Adjust stock on a specific variant for this item.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/item-variant-not-found': {
    message: 'The selected item variant was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/item-variant-required': {
    message: 'Select a variant before using this item.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/item-variants-conversion-blocked': {
    message:
      'An item already used on quotes or invoices cannot be converted to variants in this release.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/item-variants-disabled': {
    message: 'Product variants are not enabled for this workspace.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/item-variants-in-use': {
    message: 'Product variants cannot be disabled while variant items exist.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/oauth-invalid-state': {
    message:
      'The accounting provider authorization state is invalid or expired.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'billing/price-list-invalid': {
    message: 'The selected price list is incomplete or invalid.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/price-list-not-found': {
    message: 'The selected price list was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/price-not-found': {
    message: 'The selected price was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/price-quantity-unavailable': {
    message: 'The selected price does not cover the requested quantity.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
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
  'billing/recurring-invoice-currency-disabled': {
    message: 'Enable the recurring invoice currency before using it.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/recurring-invoice-customer-not-found': {
    message: 'The selected customer was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/recurring-invoice-delete-not-allowed': {
    message:
      'A Recurring Invoice that has generated invoices cannot be deleted. Stop it instead.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/recurring-invoice-invalid-lines': {
    message: 'The Recurring Invoice lines are invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/recurring-invoice-invalid-state': {
    message:
      'This Recurring Invoice cannot be changed from its current status.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/recurring-invoice-not-found': {
    message: 'Recurring Invoice not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/sales-order-already-invoiced': {
    message: 'This Sales Order already has an active invoice.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/sales-order-currency-disabled': {
    message: 'Enable the Sales Order currency before using it.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/sales-order-customer-not-found': {
    message: 'The selected customer was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'billing/sales-order-invalid-lines': {
    message: 'The Sales Order lines are invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'billing/sales-order-invalid-state': {
    message: 'This Sales Order cannot be changed from its current status.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'billing/sales-order-not-found': {
    message: 'The Sales Order was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
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
