/**
 * Billing contracts and colocated Zod schemas.
 *
 * Import types from `@876/billing` (public surface) or from this folder for
 * internal package use. Runtime schemas stay internal — they are re-exported
 * from `../schemas` for existing resource importers.
 */

// Shared primitives and enums
export type {
  Error,
  Result,
  List,
  ClientOptions,
  RequestOptions,
  MinorAmount,
  JsonValue,
} from './common'
export {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'
export type {
  CustomerType,
  CustomerKind,
  TaxBehavior,
  LateFeeCalculationType,
  BankAccountType,
  BankTransactionType,
  BankTransactionStatus,
  SubscriptionStatus,
  ItemType,
  IntervalUnit,
  PriceType,
  PricingModel,
  AddonAssociationType,
  AddonAssociationEvent,
  AddonAssociationFrequency,
  SubscriptionChangeTiming,
  SubscriptionResumeBillingBehavior,
} from './enums'

// Customer
export type {
  CustomerCreateParams,
  CustomerCreated,
  CustomerOpeningBalanceParams,
  CustomerLedgerEntry,
  CustomerAccount,
} from './customer'
export { CustomerCreatedSchema, CustomerAccountSchema } from './customer.schema'

// Invoice
export type {
  DocumentLineCreateParams,
  InvoiceCreateParams,
  InvoicePreferenceUpdateParams,
  InvoicePreference,
  InvoicePreferenceUpdated,
  LateFeeRun,
  InvoiceFinalizeParams,
  InvoiceVoidParams,
  InvoiceCreated,
} from './invoice'
export {
  InvoiceCreatedSchema,
  InvoicePreferenceSchema,
  InvoicePreferenceUpdatedSchema,
  LateFeeRunSchema,
} from './invoice.schema'

// Bank
export type {
  BankAccountCreateParams,
  BankAccountUpdateParams,
  BankAccount,
  BankAccountCreated,
  BankAccountDeleted,
} from './bank-account'
export {
  BankAccountTypeSchema,
  BankAccountCreatedSchema,
  BankAccountDeletedSchema,
  BankAccountSchema,
  BankAccountListSchema,
} from './bank-account.schema'
export type {
  BankTransactionCreateParams,
  BankTransactionUpdateParams,
  BankTransaction,
  BankTransactionCreated,
  BankTransactionDeleted,
} from './bank-transaction'
export {
  BankTransactionCreatedSchema,
  BankTransactionDeletedSchema,
  BankTransactionSchema,
  BankTransactionListSchema,
} from './bank-transaction.schema'

// Payment mode + payment
export type {
  PaymentModeCreateParams,
  PaymentModeUpdateParams,
  PaymentMode,
  PaymentModeCreated,
  PaymentModeDeleted,
} from './payment-mode'
export {
  PaymentModeCreatedSchema,
  PaymentModeDeletedSchema,
  PaymentModeSchema,
  PaymentModeListSchema,
} from './payment-mode.schema'
export type {
  PaymentAllocationParams,
  PaymentCreateParams,
  PaymentApplyParams,
  PaymentUpdateParams,
  PaymentAllocation,
  Payment,
  PaymentCreated,
  PaymentDeleted,
} from './payment'
export {
  PaymentCreatedSchema,
  PaymentDeletedSchema,
  PaymentSchema,
  PaymentListSchema,
} from './payment.schema'

// Subscription core
export type {
  SubscriptionItemCreateParams,
  SubscriptionCreateParams,
  SubscriptionCreated,
  SubscriptionProrationPreviewParams,
  SubscriptionManualInvoiceParams,
  UpcomingInvoiceLine,
  UpcomingInvoice,
  ProrationPreview,
} from './subscription'
export {
  SubscriptionCreatedSchema,
  UpcomingInvoiceSchema,
  ProrationPreviewSchema,
} from './subscription.schema'

// Subscription lifecycle
export type {
  SubscriptionPauseParams,
  SubscriptionResumeParams,
  SubscriptionCancelParams,
  SubscriptionReactivateParams,
  SubscriptionExtendParams,
  SubscriptionAmendmentCreateParams,
  SubscriptionChargeCreateParams,
  SubscriptionDiscountCreateParams,
  SubscriptionMutationResult,
  SubscriptionChargeCreated,
  SubscriptionDiscountCreated,
  SubscriptionChargeMutationResult,
  SubscriptionDiscountMutationResult,
  SubscriptionPreferenceUpdateParams,
  SubscriptionPreferences,
  SubscriptionPreferencesUpdated,
  SubscriptionBulkInvoiceModeParams,
  SubscriptionBulkUpdateResult,
  SubscriptionCustomViewRuleParams,
  SubscriptionCustomViewCreateParams,
  SubscriptionCustomView,
  SubscriptionViewMutationResult,
} from './subscription-lifecycle'
export {
  SubscriptionMutationResultSchema,
  SubscriptionChargeCreatedSchema,
  SubscriptionDiscountCreatedSchema,
  SubscriptionChargeMutationResultSchema,
  SubscriptionDiscountMutationResultSchema,
  SubscriptionPreferencesSchema,
  SubscriptionPreferencesUpdatedSchema,
  SubscriptionBulkUpdateResultSchema,
  SubscriptionCustomViewListSchema,
  SubscriptionViewMutationResultSchema,
} from './subscription-lifecycle.schema'

// Commercial
export type { PaymentTermCreateParams, PaymentTerm } from './payment-term'
export {
  PaymentTermCreatedSchema,
  PaymentTermSchema,
  PaymentTermListSchema,
} from './payment-term.schema'
export type { SalespersonCreateParams, Salesperson } from './salesperson'
export {
  SalespersonCreatedSchema,
  SalespersonSchema,
  SalespersonListSchema,
} from './salesperson.schema'
export type {
  CouponCreateParams,
  CouponUpdateParams,
  CouponCreated,
  CouponDeleted,
  Coupon,
} from './coupon'
export {
  CouponCreatedSchema,
  CouponDeletedSchema,
  CouponSchema,
  CouponListSchema,
} from './coupon.schema'
export type { PromotionCodeCreateParams, PromotionCode } from './promotion-code'
export {
  PromotionCodeCreatedSchema,
  PromotionCodeSchema,
  PromotionCodeListSchema,
} from './promotion-code.schema'

// Catalog
export type {
  ProductCreateParams,
  ProductUpdateParams,
  PlanCreateParams,
  PlanUpdateParams,
  PriceTierCreateParams,
  PriceCreateParams,
  PriceUpdateParams,
  AddonAssociationUpsertParams,
  AddonAssociationBatchResult,
  AddonPriceCreateParams,
  AddonCreateParams,
  AddonUpdateParams,
  PriceListEntryCreateParams,
  PriceListCreateParams,
  PriceListUpdateParams,
  CatalogCloneParams,
  CatalogResource,
  CatalogCreated,
  CatalogDeleted,
  ResolvedPrice,
} from './catalog'

// Payment providers
export type {
  PaymentProvider,
  PaymentProviderConnectionCreateParams,
  PaymentProviderConnectionUpdateParams,
  PaymentProviderConnection,
} from './payment-provider'
export {
  PaymentProviderSchema,
  PaymentProviderConnectionCreatedSchema,
  PaymentProviderConnectionSchema,
  PaymentProviderListSchema,
  PaymentProviderConnectionListSchema,
} from './payment-provider.schema'

// Tax
export type {
  TaxAuthorityCreateParams,
  TaxAuthorityUpdateParams,
  TaxAuthority,
  TaxAuthorityCreated,
  TaxRateCreateParams,
  TaxRateUpdateParams,
  TaxRate,
  TaxRateCreated,
} from './tax'
export {
  TaxAuthorityCreatedSchema,
  TaxRateCreatedSchema,
  TaxAuthoritySchema,
  TaxRateSchema,
  TaxAuthorityListSchema,
  TaxRateListSchema,
} from './tax.schema'
