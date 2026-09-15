/**
 * Compatibility re-export for resource modules that import from `../schemas`.
 * Schemas live beside their contracts under `./types`.
 */
export {
  brandingResourceSchema,
  deletedDocumentTemplateSchema,
  documentTemplateListSchema,
  documentTemplateSchema,
  resolvedDocumentTemplateSchema,
} from '../schemas'
export {
  BillingBankAccountListSchema,
  BillingBankAccountSchema,
  BillingCustomerCreatedSchema,
  BillingCustomerListSchema,
  BillingCustomerSchema,
  BillingInvoiceListSchema,
  BillingInvoiceSchema,
  BillingQuoteListSchema,
  BillingQuoteSchema,
  BillingItemListSchema,
  BillingItemSchema,
  BillingItemVariantSchema,
  BillingItemVariantListSchema,
  BillingItemPreferencesSchema,
  BillingItemMediaSchema,
  BillingItemMediaListSchema,
  BillingOrganizationSchema,
  BillingPaymentListSchema,
  BillingPaymentCreatedSchema,
  BillingPaymentDeletedSchema,
  BillingPaymentModeListSchema,
  BillingPaymentModeSchema,
  DeletedBillingPaymentModeSchema,
  BillingPaymentSchema,
  BillingRefundCreatedSchema,
  BillingRefundListSchema,
  BillingRefundSchema,
  BillingSalesSummarySchema,
  BillingCashSummarySchema,
  BillingReceivablesAgingSchema,
  BillingItemSalesSchema,
  BillingItemSalesSummarySchema,
  BillingCustomerSalesSchema,
  BillingSubscriptionSummarySchema,
  BillingReportPreferencesSchema,
  DeletedBillingCustomerSchema,
  DeletedBillingItemSchema,
  DeletedBillingItemMediaSchema,
} from './types'

export {
  TaxAuthorityListSchema,
  TaxAuthoritySchema,
  TaxRateListSchema,
  TaxRateSchema,
} from '../types/tax.schema'
