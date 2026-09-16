/**
 * Billing contracts and colocated Zod schemas.
 *
 * Import types from `@876/billing` (public surface) or from this folder for
 * internal package use. Runtime schemas stay internal — they are re-exported
 * from `../schemas` for existing resource importers.
 */

// Shared primitives and enums
export type { Branding, BrandingUpdateParams } from './branding'
export type {
  DeletedDocumentTemplate,
  DocumentTemplate,
  DocumentTemplateCreateParams,
  DocumentTemplateList,
  DocumentTemplateListParams,
  DocumentTemplateUpdateParams,
  ResolvedDocumentTemplate,
} from './document-template'
export type {
  DocumentEmailComposition,
  DocumentEmailDelivery,
  DocumentEmailPrepareParams,
  DocumentEmailRecipient,
  DocumentEmailResourceType,
  DocumentEmailSendOptions,
  DocumentEmailSendParams,
  DocumentEmailSender,
} from './document-email'
export {
  DocumentEmailCompositionSchema,
  DocumentEmailDeliverySchema,
} from './document-email.schema'
export {
  brandingResourceSchema,
  brandingUpdateBodySchema,
} from './branding.schema'
export {
  deletedDocumentTemplateSchema,
  documentTemplateCreateBodySchema,
  documentTemplateListSchema,
  documentTemplateSchema,
  documentTemplateUpdateBodySchema,
  resolvedDocumentTemplateSchema,
} from './document-template.schema'

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

// Bank accounts + booked transactions
export type {
  BankAccountCreateParams,
  BankAccountUpdateParams,
  BankAccount,
  BankAccountCreated,
  BankAccountDeleted,
  BankAccountNumber,
} from './bank-account'
export {
  BankAccountTypeSchema,
  BankAccountCreatedSchema,
  BankAccountDeletedSchema,
  BankAccountSchema,
  BankAccountListSchema,
  BankAccountNumberSchema,
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

// Banking engine: statement evidence, matching, transfers, rules, reconciliation
export type {
  StatementLineType,
  StatementLineStatus,
  StatementImportSource,
  StatementFormat,
  StatementDateFormat,
  StatementNumberFormat,
  StatementFileMapping,
  StatementFilePreviewParams,
  StatementFileImportParams,
  BankStatementLineInput,
  BankStatementImportCreateParams,
  BankStatementImport,
  BankStatementLine,
  BankStatementImportWithLines,
  BankStatementMatchItem,
  BankStatementMatch,
  BankStatementMatchParams,
  BankMatchCandidate,
  BankStatementCategorizeParams,
  BankStatementCategorizeResult,
  BankStatementPreviewLine,
  BankStatementPreviewError,
  BankStatementPreview,
  BankTransferCreateParams,
  BankTransfer,
  BankReconciliationCreateParams,
  BankReconciliation,
  BankRuleField,
  BankRuleOperator,
  BankRuleConditionParams,
  BankRuleAction,
  BankRuleCreateParams,
  BankRuleUpdateParams,
  BankRule,
  DeletedBankRule,
  BankStatementImportList,
  BankStatementLineList,
  BankMatchCandidateList,
  BankTransferList,
  BankDepositCreateParams,
  BankDeposit,
  BankDepositList,
  BankReconciliationList,
  BankRuleList,
} from './banking'
export {
  BankStatementImportSchema,
  BankStatementLineSchema,
  BankStatementImportWithLinesSchema,
  BankStatementMatchSchema,
  BankMatchCandidateSchema,
  BankStatementCategorizeResultSchema,
  BankStatementPreviewSchema,
  BankTransferSchema,
  BankDepositSchema,
  BankReconciliationSchema,
  BankRuleSchema,
  DeletedBankRuleSchema,
  BankStatementImportListSchema,
  BankStatementLineListSchema,
  BankMatchCandidateListSchema,
  BankTransferListSchema,
  BankDepositListSchema,
  BankReconciliationListSchema,
  BankRuleListSchema,
} from './banking.schema'

// Catalog + pricing
export type * from './catalog'
export * from './catalog.schema'

// Payments
export type * from './payment'
export * from './payment.schema'

// Reporting
export type * from './reporting'
export * from './reporting.schema'

// Access
export type * from './access'
export * from './access.schema'

// Subscriptions
export type * from './subscription'
export * from './subscription.schema'
