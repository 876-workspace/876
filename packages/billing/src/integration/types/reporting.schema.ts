import {
  CashSummarySchema,
  CustomerSalesSchema,
  ItemSalesSchema,
  ItemSalesSummarySchema,
  ReceivablesAgingSchema,
  ReportPreferencesSchema,
  SalesSummarySchema,
  SubscriptionSummarySchema,
} from '../../types/reporting.schema'

export const BillingSalesSummarySchema = SalesSummarySchema
export const BillingCashSummarySchema = CashSummarySchema
export const BillingReceivablesAgingSchema = ReceivablesAgingSchema
export const BillingItemSalesSchema = ItemSalesSchema
export const BillingItemSalesSummarySchema = ItemSalesSummarySchema
export const BillingCustomerSalesSchema = CustomerSalesSchema
export const BillingSubscriptionSummarySchema = SubscriptionSummarySchema
export const BillingReportPreferencesSchema = ReportPreferencesSchema
