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
  BillingCustomer,
  BillingCustomerCreateParams,
  BillingCustomerListParams,
  BillingCustomerUpdateParams,
  DeletedBillingCustomer,
  BillingCustomerList,
} from './customer'
export {
  sourceSchema,
  BillingCustomerSchema,
  BillingCustomerListSchema,
  DeletedBillingCustomerSchema,
} from './customer.schema'
export type {
  BillingItem,
  BillingItemCreateParams,
  BillingItemUpdateParams,
  BillingItemListParams,
  DeletedBillingItem,
  BillingItemList,
} from './item'
export {
  BillingItemSchema,
  BillingItemListSchema,
  DeletedBillingItemSchema,
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
export {
  BillingInvoiceSchema,
  BillingInvoiceListSchema,
} from './invoice.schema'
export type { BillingPaymentMode, BillingPaymentModeList } from './payment-mode'
export {
  BillingPaymentModeSchema,
  BillingPaymentModeListSchema,
} from './payment-mode.schema'
export type { BillingBankAccount, BillingBankAccountList } from './bank-account'
export {
  BillingBankAccountSchema,
  BillingBankAccountListSchema,
} from './bank-account.schema'
export type {
  BillingPaymentAllocationCreateParams,
  BillingPaymentCreateParams,
  BillingPayment,
  BillingPaymentList,
} from './payment'
export {
  BillingPaymentSchema,
  BillingPaymentListSchema,
} from './payment.schema'
