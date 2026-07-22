/**
 * Shared string-union enumerations used by Billing contracts.
 *
 * These are type-only unions (not runtime TypeScript enums) so they stay
 * erasable and match the wire format returned by the Billing API.
 */

/**
 * How a customer is linked to the 876 identity platform.
 * One of `EXTERNAL`, `CORE_USER`, or `CORE_ORGANIZATION`.
 */
export type CustomerType = 'EXTERNAL' | 'CORE_USER' | 'CORE_ORGANIZATION'

/**
 * Whether the customer is a person or a business.
 * One of `INDIVIDUAL` or `BUSINESS`.
 */
export type CustomerKind = 'INDIVIDUAL' | 'BUSINESS'

/**
 * Whether tax is applied on top of amounts or included in them.
 * One of `EXCLUSIVE` or `INCLUSIVE`.
 */
export type TaxBehavior = 'EXCLUSIVE' | 'INCLUSIVE'

/**
 * How late fees are calculated for overdue invoices.
 * One of `PERCENTAGE` or `FIXED`.
 */
export type LateFeeCalculationType = 'PERCENTAGE' | 'FIXED'

/**
 * Classification of a tenant financial account.
 * One of `CHECKING`, `SAVINGS`, `CREDIT_CARD`, `CASH`, `PAYPAL`,
 * `UNDEPOSITED_FUNDS`, or `PETTY_CASH`.
 */
export type BankAccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'PAYPAL'
  | 'UNDEPOSITED_FUNDS'
  | 'PETTY_CASH'

/**
 * Direction of a bank transaction.
 * One of `CREDIT` or `DEBIT`.
 */
export type BankTransactionType = 'CREDIT' | 'DEBIT'

/**
 * Reconciliation state of a bank transaction.
 * One of `UNCATEGORIZED`, `CATEGORIZED`, `MATCHED`, or `EXCLUDED`.
 */
export type BankTransactionStatus =
  | 'UNCATEGORIZED'
  | 'CATEGORIZED'
  | 'MATCHED'
  | 'EXCLUDED'

/**
 * Lifecycle status of a commercial subscription.
 * One of `DRAFT`, `TRIALING`, `ACTIVE`, `PAUSED`, `CANCELED`, or `ENDED`.
 */
export type SubscriptionStatus =
  | 'DRAFT'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELED'
  | 'ENDED'

/**
 * Catalog item kind.
 * One of `GOOD` or `SERVICE`.
 */
export type ItemType = 'GOOD' | 'SERVICE'

/**
 * Billing period unit for recurring prices and plans.
 * One of `DAY`, `WEEK`, `MONTH`, or `YEAR`.
 */
export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

/**
 * Whether a price is charged once or on a schedule.
 * One of `ONE_TIME` or `RECURRING`.
 */
export type PriceType = 'ONE_TIME' | 'RECURRING'

/**
 * Pricing formula applied to a price or addon.
 * One of `FLAT`, `PER_UNIT`, `VOLUME`, `TIERED`, or `PACKAGE`.
 */
export type PricingModel = 'FLAT' | 'PER_UNIT' | 'VOLUME' | 'TIERED' | 'PACKAGE'

/**
 * Strength of an addon association to a plan.
 * One of `OPTIONAL`, `RECOMMENDED`, or `MANDATORY`.
 */
export type AddonAssociationType = 'OPTIONAL' | 'RECOMMENDED' | 'MANDATORY'

/**
 * Lifecycle event that can surface a plan addon association.
 * One of `SUBSCRIPTION_ACTIVATION`, `PLAN_CHANGE`, or `TRIAL_ACTIVATION`.
 */
export type AddonAssociationEvent =
  | 'SUBSCRIPTION_ACTIVATION'
  | 'PLAN_CHANGE'
  | 'TRIAL_ACTIVATION'

/**
 * How often an addon association should be applied.
 * One of `EVERY_OCCURRENCE` or `FIRST_OCCURRENCE`.
 */
export type AddonAssociationFrequency = 'EVERY_OCCURRENCE' | 'FIRST_OCCURRENCE'

/**
 * When a subscription lifecycle mutation takes effect.
 * One of `IMMEDIATE`, `END_OF_TERM`, or `SCHEDULED`.
 */
export type SubscriptionChangeTiming = 'IMMEDIATE' | 'END_OF_TERM' | 'SCHEDULED'

/**
 * How billing resumes after a subscription pause.
 * One of `CONTINUE_EXISTING_PERIOD` or `START_NEW_PERIOD`.
 */
export type SubscriptionResumeBillingBehavior =
  | 'CONTINUE_EXISTING_PERIOD'
  | 'START_NEW_PERIOD'
