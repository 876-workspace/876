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
  CustomerContact,
  CustomerContactCreateParams,
  CustomerContactCreated,
  CustomerContactUpdateParams,
  CustomerContactList,
  DeletedCustomerContact,
  CustomerStatus,
  Customer,
  CustomerList,
  CustomerListParams,
  CustomerUpdateParams,
  DeletedCustomer,
} from './customer'
export {
  CustomerCreatedSchema,
  CustomerContactCreatedSchema,
  CustomerAccountSchema,
  CustomerContactSchema,
  CustomerContactListSchema,
  DeletedCustomerContactSchema,
  CustomerSchema,
  CustomerListSchema,
  DeletedCustomerSchema,
} from './customer.schema'

// Invoice
export type {
  InvoiceListParams,
  Invoice,
  InvoiceList,
  DocumentLineCreateParams,
  InvoiceCreateParams,
  InvoicePreferenceUpdateParams,
  InvoicePreference,
  InvoicePreferenceUpdated,
  LateFeeRun,
  InvoiceFinalizeParams,
  InvoiceVoidParams,
  InvoiceWriteOffParams,
  InvoiceCreated,
  InvoiceUpdateParams,
  InvoiceDetail,
  DeletedInvoice,
  QuoteListParams,
  QuoteCreateParams,
  QuoteLineCreateParams,
  QuoteUpdateParams,
  Quote,
  QuoteList,
  DeletedQuote,
} from './invoice'
export {
  InvoiceSchema,
  DeletedInvoiceSchema,
  InvoiceListSchema,
  InvoiceCreatedSchema,
  InvoicePreferenceSchema,
  InvoicePreferenceUpdatedSchema,
  LateFeeRunSchema,
  QuoteSchema,
  QuoteListSchema,
  DeletedQuoteSchema,
} from './invoice.schema'

export type {
  RecurringInvoice,
  RecurringInvoiceStatus,
  RecurringInvoiceGenerationMode,
  RecurringInvoiceFrequency,
  RecurringInvoiceCreateParams,
  RecurringInvoiceFromInvoiceParams,
  RecurringInvoiceUpdateParams,
  RecurringInvoiceList,
  RecurringInvoiceListParams,
  DeletedRecurringInvoice,
} from './recurring-invoice'
export {
  RecurringInvoiceSchema,
  RecurringInvoiceListSchema,
  DeletedRecurringInvoiceSchema,
} from './recurring-invoice.schema'

// Credit notes
export type {
  CreditNote,
  CreditNoteAllocationParams,
  CreditNoteApplyParams,
  CreditNoteCreateParams,
  CreditNoteLineCreateParams,
  CreditNoteList,
  CreditNoteListParams,
} from './credit-note'
export { CreditNoteListSchema, CreditNoteSchema } from './credit-note.schema'

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
  PaymentMethodType,
  PaymentMethodStatus,
  PaymentMethodCreateParams,
  PaymentMethodUpdateParams,
  PaymentMethodListParams,
  PaymentMethod,
  PaymentMethodList,
  DeletedPaymentMethod,
} from './payment-method'
export {
  DeletedPaymentMethodSchema,
  PaymentMethodListSchema,
  PaymentMethodSchema,
} from './payment-method.schema'
export type {
  PaymentIntentStatus,
  PaymentIntentCreateParams,
  PaymentIntentCancelParams,
  PaymentIntentListParams,
  PaymentIntent,
  PaymentIntentList,
} from './payment-intent'
export {
  PaymentIntentListSchema,
  PaymentIntentSchema,
} from './payment-intent.schema'
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

// Currencies
export type {
  Currency,
  CurrencyCreated,
  CurrencyEnableParams,
  CurrencyMutation,
} from './currency'
export {
  CurrencyCreatedSchema,
  CurrencyListSchema,
  CurrencyMutationSchema,
  CurrencySchema,
} from './currency'

// Reporting
export type {
  ReportGroupBy,
  ReportRangeParams,
  CashSummaryParams,
  ReceivablesAgingParams,
  ItemSalesParams,
  ItemSalesSummaryParams,
  CustomerSalesParams,
  SubscriptionSummaryParams,
  ReportPreferences,
  ReportPreferencesUpdateParams,
  MoneyBreakdown,
  InvoiceSourceSplit,
  SalesSummary,
  CashSummary,
  ReceivablesAging,
  ItemSalesRow,
  ItemSales,
  ItemSalesSummary,
  CustomerSales,
  SubscriptionSummary,
} from './reporting'
export {
  SalesSummarySchema,
  CashSummarySchema,
  ReceivablesAgingSchema,
  ItemSalesSchema,
  ItemSalesSummarySchema,
  CustomerSalesSchema,
  SubscriptionSummarySchema,
  ReportPreferencesSchema,
} from './reporting.schema'

// Finance workspace roles
export type {
  Role,
  RoleCreated,
  RoleCreateParams,
  RoleDeleted,
  RoleUpdateParams,
} from './role'
export {
  RoleCreatedSchema,
  RoleDeletedSchema,
  RoleListSchema,
  RoleSchema,
} from './role.schema'

// Finance workspace members
export type {
  Member,
  MemberAccess,
  MemberAccessResolveParams,
  MemberRole,
  MemberStatus,
  MemberUpdateParams,
  MemberUpdated,
} from './member'
export {
  MemberAccessSchema,
  MemberListSchema,
  MemberSchema,
  MemberUpdatedSchema,
} from './member.schema'
