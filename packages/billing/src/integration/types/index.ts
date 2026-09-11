/**
 * Billing integration contracts and colocated Zod schemas.
 *
 * Public package surface re-exports types only via `@876/billing/integration`.
 * Runtime schemas stay internal and are re-exported from `../schemas`.
 */

export type {
  IntegrationClientOptions,
  IntegrationCreateOptions,
  BillingSource,
  IntegrationError,
  IntegrationResult,
  List,
} from './common'
export type {
  BillingCustomerType,
  BillingCustomerKind,
  BillingCustomerStatus,
  BillingItemType,
  BillingInvoiceStatus,
  BillingBankAccountType,
} from './enums'
export type { BillingOrganization } from './organization'
export { BillingOrganizationSchema } from './organization.schema'
export type {
  BillingContact,
  BillingCustomer,
  BillingCustomerCreateParams,
  BillingCustomerListParams,
  BillingCustomerUpdateParams,
  DeletedBillingCustomer,
  BillingCustomerList,
} from './customer'
export {
  sourceSchema,
  BillingContactSchema,
  BillingCustomerSchema,
  BillingCustomerCreatedSchema,
  BillingCustomerListSchema,
  DeletedBillingCustomerSchema,
} from './customer.schema'
export type { BillingCustomerCreated } from './customer.schema'
export type {
  BillingItem,
  BillingItemCreateParams,
  BillingItemUpdateParams,
  BillingItemStockAdjustmentParams,
  BillingItemListParams,
  BillingItemList,
  BillingItemVariantMode,
  BillingItemVariantOptionInput,
  BillingItemVariantStockAllocation,
  BillingItemVariantOption,
  BillingItemVariantMedia,
  BillingItemVariantParent,
  BillingItemVariant,
  BillingItemVariantListParams,
  BillingItemVariantGenerateParams,
  BillingItemVariantUpdateParams,
  BillingItemVariantList,
  BillingItemPreferences,
  BillingItemPreferencesUpdateParams,
  BillingItemMedia,
  BillingItemMediaAttachParams,
  BillingItemMediaReorderParams,
  BillingItemMediaList,
  DeletedBillingItem,
  DeletedBillingItemMedia,
} from './item'
export {
  BillingItemSchema,
  BillingItemListSchema,
  BillingItemVariantOptionSchema,
  BillingItemVariantMediaSchema,
  BillingItemVariantParentSchema,
  BillingItemVariantSchema,
  BillingItemVariantListSchema,
  BillingItemPreferencesSchema,
  BillingItemMediaSchema,
  BillingItemMediaListSchema,
  DeletedBillingItemSchema,
  DeletedBillingItemMediaSchema,
} from './item.schema'
export type {
  BillingInvoiceLineCreateParams,
  BillingInvoiceCreateParams,
  BillingInvoiceUpdateParams,
  BillingInvoiceFinalizeParams,
  BillingInvoiceVoidParams,
  BillingInvoiceLine,
  BillingInvoice,
  BillingInvoiceListParams,
  BillingInvoiceList,
} from './invoice'
export type { BillingInvoiceWriteOffParams } from './invoice-write-off'
export {
  BillingInvoiceSchema,
  BillingInvoiceListSchema,
} from './invoice.schema'
export type {
  BillingQuote,
  BillingQuoteCreateParams,
  BillingQuoteLineCreateParams,
  BillingQuoteList,
  BillingQuoteListParams,
} from './quote'
export { BillingQuoteListSchema, BillingQuoteSchema } from './quote.schema'
export type {
  BillingPaymentMode,
  BillingPaymentModeCreateParams,
  BillingPaymentModeDeleted,
  BillingPaymentModeList,
  BillingPaymentModeUpdateParams,
} from './payment-mode'
export {
  BillingPaymentModeSchema,
  BillingPaymentModeListSchema,
  DeletedBillingPaymentModeSchema,
} from './payment-mode.schema'
export type { BillingBankAccount, BillingBankAccountList } from './bank-account'
export {
  BillingBankAccountSchema,
  BillingBankAccountListSchema,
} from './bank-account.schema'
export type {
  BillingPaymentAllocationCreateParams,
  BillingPaymentCreateParams,
  BillingPaymentUpdateParams,
  BillingPaymentApplyParams,
  BillingPaymentCreated,
  BillingPaymentDeleted,
  BillingPayment,
  BillingPaymentList,
} from './payment'
export {
  BillingPaymentCreatedSchema,
  BillingPaymentDeletedSchema,
  BillingPaymentSchema,
  BillingPaymentListSchema,
} from './payment.schema'
export type {
  BillingRefundCreateParams,
  BillingRefund,
  BillingRefundCreated,
  BillingRefundList,
} from './refund'
export {
  BillingRefundSchema,
  BillingRefundCreatedSchema,
  BillingRefundListSchema,
} from './refund.schema'
export type {
  BillingReportGroupBy,
  BillingReportRangeParams,
  BillingCashSummaryParams,
  BillingReceivablesAgingParams,
  BillingItemSalesParams,
  BillingItemSalesSummaryParams,
  BillingCustomerSalesParams,
  BillingSubscriptionSummaryParams,
  BillingSalesSummary,
  BillingCashSummary,
  BillingReceivablesAging,
  BillingItemSales,
  BillingItemSalesSummary,
  BillingCustomerSales,
  BillingSubscriptionSummary,
  BillingReportPreferences,
  BillingReportPreferencesUpdateParams,
} from './reporting'
export {
  BillingSalesSummarySchema,
  BillingCashSummarySchema,
  BillingReceivablesAgingSchema,
  BillingItemSalesSchema,
  BillingItemSalesSummarySchema,
  BillingCustomerSalesSchema,
  BillingSubscriptionSummarySchema,
  BillingReportPreferencesSchema,
} from './reporting.schema'
