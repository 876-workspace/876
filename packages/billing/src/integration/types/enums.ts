/**
 * Shared string-union enumerations for Billing integration contracts.
 */

/**
 * How a customer is linked to the 876 identity platform.
 * One of `EXTERNAL`, `CORE_USER`, or `CORE_ORGANIZATION`.
 */
export type BillingCustomerType = 'EXTERNAL' | 'CORE_USER' | 'CORE_ORGANIZATION'

/**
 * Whether the customer is a person or a business.
 * One of `INDIVIDUAL` or `BUSINESS`.
 */
export type BillingCustomerKind = 'INDIVIDUAL' | 'BUSINESS'

/**
 * Lifecycle status of an integration customer.
 * One of `ACTIVE` or `ARCHIVED`.
 */
export type BillingCustomerStatus = 'ACTIVE' | 'ARCHIVED'

/**
 * Catalog item kind.
 * One of `GOOD` or `SERVICE`.
 */
export type BillingItemType = 'GOOD' | 'SERVICE'

/**
 * Lifecycle status of an integration invoice.
 * One of `DRAFT`, `OPEN`, `SENT`, `PARTIALLY_PAID`, `OVERDUE`, `PAID`,
 * `UNCOLLECTIBLE`, or `VOID`.
 */
export type BillingInvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID'

/**
 * Classification of a tenant financial account.
 * One of `CHECKING`, `SAVINGS`, `CREDIT_CARD`, `CASH`, `PAYPAL`,
 * `UNDEPOSITED_FUNDS`, or `PETTY_CASH`.
 */
export type BillingBankAccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'PAYPAL'
  | 'UNDEPOSITED_FUNDS'
  | 'PETTY_CASH'
