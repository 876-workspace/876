import { z } from 'zod'

import type {
  BankAccount,
  BankAccountCreated,
  BankAccountDeleted,
  BankTransaction,
  BankTransactionCreated,
  BankTransactionDeleted,
  CustomerCreated,
  CustomerAccount,
  Coupon,
  CouponDeleted,
  List,
  PaymentProvider,
  PaymentProviderConnection,
  PaymentTerm,
  ProrationPreview,
  PromotionCode,
  Salesperson,
  UpcomingInvoice,
  InvoiceCreated,
  InvoicePreference,
  InvoicePreferenceUpdated,
  LateFeeRun,
  SubscriptionCreated,
  SubscriptionChargeCreated,
  SubscriptionChargeMutationResult,
  SubscriptionDiscountCreated,
  SubscriptionDiscountMutationResult,
  SubscriptionMutationResult,
  SubscriptionPreferences,
  SubscriptionPreferencesUpdated,
  SubscriptionBulkUpdateResult,
  SubscriptionCustomView,
  SubscriptionViewMutationResult,
  Payment,
  PaymentCreated,
  PaymentDeleted,
  PaymentMode,
  PaymentModeCreated,
  PaymentModeDeleted,
  TaxAuthority,
  TaxAuthorityCreated,
  TaxRate,
  TaxRateCreated,
} from './types'

const BankAccountTypeSchema = z.enum([
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'PAYPAL',
  'UNDEPOSITED_FUNDS',
  'PETTY_CASH',
])

const BankTransactionTypeSchema = z.enum(['CREDIT', 'DEBIT'])
const BankTransactionStatusSchema = z.enum([
  'UNCATEGORIZED',
  'CATEGORIZED',
  'MATCHED',
  'EXCLUDED',
])

export const CustomerCreatedSchema = createdResourceSchema(
  'customer'
) satisfies z.ZodType<CustomerCreated>

export const InvoiceCreatedSchema = createdResourceSchema(
  'invoice'
) satisfies z.ZodType<InvoiceCreated>

export const InvoicePreferenceSchema = z.strictObject({
  object: z.literal('invoice_preference'),
  tenantId: z.string().min(1),
  defaultTaxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  defaultNotes: z.string().nullable(),
  defaultTerms: z.string().nullable(),
  allowEditingSentInvoices: z.boolean(),
  lateFeesEnabled: z.boolean(),
  lateFeeCalculationType: z.enum(['PERCENTAGE', 'FIXED']),
  lateFeePercent: z.string().nullable(),
  lateFeeAmount: z.string().nullable(),
  lateFeeGraceDays: z.number().int(),
  lateFeeGenerateAsDraft: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<InvoicePreference>

export const InvoicePreferenceUpdatedSchema = z.strictObject({
  object: z.literal('invoice_preference'),
  tenantId: z.string().min(1),
}) satisfies z.ZodType<InvoicePreferenceUpdated>

export const LateFeeRunSchema = z.strictObject({
  object: z.literal('late_fee_run'),
  created: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  hasMore: z.boolean(),
}) satisfies z.ZodType<LateFeeRun>

export const SubscriptionCreatedSchema = createdResourceSchema(
  'subscription'
) satisfies z.ZodType<SubscriptionCreated>

export const SubscriptionMutationResultSchema = z.strictObject({
  object: z.enum([
    'subscription',
    'subscription_schedule',
    'subscription_amendment',
  ]),
  id: z.string().min(1),
  scheduled: z.boolean().optional(),
  applied: z.boolean().optional(),
  successor: z.boolean().optional(),
  deleted: z.boolean().optional(),
}) satisfies z.ZodType<SubscriptionMutationResult>

export const SubscriptionChargeCreatedSchema = z.strictObject({
  object: z.literal('subscription_charge'),
  id: z.string().min(1),
  invoiceId: z.string().nullable(),
}) satisfies z.ZodType<SubscriptionChargeCreated>

export const SubscriptionDiscountCreatedSchema = z.strictObject({
  object: z.literal('subscription_discount'),
  id: z.string().min(1),
}) satisfies z.ZodType<SubscriptionDiscountCreated>

export const SubscriptionChargeMutationResultSchema = z.strictObject({
  object: z.literal('subscription_charge'),
  id: z.string().min(1),
  voided: z.boolean(),
}) satisfies z.ZodType<SubscriptionChargeMutationResult>

export const SubscriptionDiscountMutationResultSchema = z.strictObject({
  object: z.literal('subscription_discount'),
  id: z.string().min(1),
  deleted: z.boolean(),
}) satisfies z.ZodType<SubscriptionDiscountMutationResult>

const IntervalUnitSchema = z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR'])
const SubscriptionViewRuleSchema = z.strictObject({
  id: z.string().min(1),
  viewId: z.string().min(1),
  position: z.number().int(),
  field: z.enum([
    'status',
    'customerId',
    'customerName',
    'currency',
    'collectionMethod',
    'billingTiming',
    'taxBehavior',
    'createdAt',
    'currentPeriodEnd',
  ]),
  operator: z.enum([
    'EQUALS',
    'NOT_EQUALS',
    'CONTAINS',
    'IN',
    'BEFORE',
    'AFTER',
    'IS_EMPTY',
    'IS_NOT_EMPTY',
  ]),
  value: z.string().nullable(),
})
const SubscriptionCustomViewSchema = z.strictObject({
  object: z.literal('subscription_view'),
  id: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string(),
  ownerUserId: z.string().nullable(),
  visibility: z.enum(['PRIVATE', 'TENANT']),
  isFavorite: z.boolean(),
  sortField: z.string().nullable(),
  sortDirection: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  rules: z.array(SubscriptionViewRuleSchema),
  columns: z.array(
    z.strictObject({
      id: z.string().min(1),
      viewId: z.string().min(1),
      position: z.number().int(),
      field: z.string(),
    })
  ),
}) satisfies z.ZodType<SubscriptionCustomView>

export const SubscriptionPreferencesSchema = z.strictObject({
  object: z.literal('subscription_preferences'),
  tenantId: z.string().min(1),
  defaultTaxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  defaultCollectionMethod: z.enum(['SEND_INVOICE', 'AUTO_CHARGE']),
  defaultBillingTiming: z.enum(['IN_ADVANCE', 'IN_ARREARS']),
  defaultProrationBehavior: z.enum([
    'CREATE_PRORATIONS',
    'ALWAYS_INVOICE',
    'NONE',
  ]),
  defaultInvoiceMode: z.enum(['AUTO_FINALIZE', 'DRAFT']),
  notifyDraftInvoice: z.boolean(),
  consolidatedBillingEnabled: z.boolean(),
  calendarMode: z.enum(['ANNIVERSARY', 'FIXED_DATES']),
  pauseResumeEnabled: z.boolean(),
  pauseUnbilledChargeBehavior: z.enum(['RETAIN', 'INVOICE_IMMEDIATELY']),
  pauseCreditBehavior: z.enum(['NONE', 'PRORATE_CREDIT']),
  defaultResumeBillingBehavior: z.enum([
    'CONTINUE_EXISTING_PERIOD',
    'START_NEW_PERIOD',
  ]),
  defaultRenewalPricingPolicy: z.enum([
    'RETAIN_EXISTING',
    'USE_LATEST',
    'MARKUP',
    'MARKDOWN',
  ]),
  lockTrialAndFutureActivationPrice: z.boolean(),
  autoApplyCredits: z.boolean(),
  autoApplyExcessPayments: z.boolean(),
  advanceBillingEnabled: z.boolean(),
  advanceBillingMethod: z.literal('INVOICE'),
  automateAdvanceBilling: z.boolean(),
  advanceTermsFromPeriodStart: z.boolean(),
  notifyAdvanceBillingFailure: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  advanceRules: z.array(
    z.strictObject({
      tenantId: z.string().min(1),
      intervalUnit: IntervalUnitSchema,
      daysBefore: z.number().int(),
      createdAt: z.number().int(),
      updatedAt: z.number().int(),
    })
  ),
  calendarDays: z.array(
    z.strictObject({
      tenantId: z.string().min(1),
      dayOfMonth: z.number().int(),
    })
  ),
  calendarMonths: z.array(
    z.strictObject({
      tenantId: z.string().min(1),
      month: z.number().int(),
    })
  ),
}) satisfies z.ZodType<SubscriptionPreferences>

export const SubscriptionPreferencesUpdatedSchema = z.strictObject({
  object: z.literal('subscription_preferences'),
  tenantId: z.string().min(1),
}) satisfies z.ZodType<SubscriptionPreferencesUpdated>

export const SubscriptionBulkUpdateResultSchema = z.strictObject({
  object: z.literal('subscription_bulk_update'),
  updated: z.number().int().nonnegative(),
}) satisfies z.ZodType<SubscriptionBulkUpdateResult>

export const SubscriptionCustomViewListSchema = listSchema(
  SubscriptionCustomViewSchema
) satisfies z.ZodType<List<SubscriptionCustomView>>

export const SubscriptionViewMutationResultSchema = z.strictObject({
  object: z.literal('subscription_view'),
  id: z.string().min(1),
  deleted: z.boolean().optional(),
}) satisfies z.ZodType<SubscriptionViewMutationResult>

export const PaymentTermCreatedSchema = createdResourceSchema('payment_term')
export const SalespersonCreatedSchema = createdResourceSchema('salesperson')
export const CouponCreatedSchema = createdResourceSchema('coupon')
export const CouponDeletedSchema = deletedResourceSchema(
  'coupon'
) satisfies z.ZodType<CouponDeleted>
export const PromotionCodeCreatedSchema =
  createdResourceSchema('promotion_code')
export const PaymentProviderConnectionCreatedSchema = createdResourceSchema(
  'payment_provider_connection'
)

export const BankAccountCreatedSchema = createdResourceSchema(
  'bank_account'
) satisfies z.ZodType<BankAccountCreated>

export const BankAccountDeletedSchema = deletedResourceSchema(
  'bank_account'
) satisfies z.ZodType<BankAccountDeleted>

export const BankTransactionCreatedSchema = createdResourceSchema(
  'bank_transaction'
) satisfies z.ZodType<BankTransactionCreated>

export const BankTransactionDeletedSchema = deletedResourceSchema(
  'bank_transaction'
) satisfies z.ZodType<BankTransactionDeleted>

export const PaymentModeCreatedSchema = createdResourceSchema(
  'payment_mode'
) satisfies z.ZodType<PaymentModeCreated>

export const PaymentModeDeletedSchema = deletedResourceSchema(
  'payment_mode'
) satisfies z.ZodType<PaymentModeDeleted>

export const PaymentCreatedSchema = createdResourceSchema(
  'payment'
) satisfies z.ZodType<PaymentCreated>

export const PaymentDeletedSchema = deletedResourceSchema(
  'payment'
) satisfies z.ZodType<PaymentDeleted>

export const TaxAuthorityCreatedSchema = createdResourceSchema(
  'tax_authority'
) satisfies z.ZodType<TaxAuthorityCreated>

export const TaxRateCreatedSchema = createdResourceSchema(
  'tax_rate'
) satisfies z.ZodType<TaxRateCreated>

export const TaxAuthoritySchema = z.object({
  object: z.literal('tax_authority'),
  id: z.string().min(1),
  name: z.string(),
  description: z.string().nullable(),
  countryCode: z.string(),
  subdivisionCode: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<TaxAuthority>

export const TaxRateSchema = z.object({
  object: z.literal('tax_rate'),
  id: z.string().min(1),
  name: z.string(),
  description: z.string().nullable(),
  taxType: z.string().nullable(),
  rate: z.string(),
  inclusive: z.boolean(),
  startsAt: z.number().int().nullable(),
  isActive: z.boolean(),
  taxAuthority: TaxAuthoritySchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<TaxRate>

export const BankAccountSchema = z.strictObject({
  object: z.literal('bank_account'),
  id: z.string().min(1),
  name: z.string(),
  accountType: BankAccountTypeSchema,
  currency: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  balance: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankAccount>

export const BankTransactionSchema = z.strictObject({
  object: z.literal('bank_transaction'),
  id: z.string().min(1),
  accountId: z.string().min(1),
  paymentId: z.string().min(1).nullable(),
  type: BankTransactionTypeSchema,
  amount: z.string(),
  date: z.number().int(),
  description: z.string().nullable(),
  status: BankTransactionStatusSchema,
  reference: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankTransaction>

export const PaymentModeSchema = z.strictObject({
  object: z.literal('payment_mode'),
  id: z.string().min(1),
  name: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentMode>

const PaymentAllocationSchema = z.strictObject({
  object: z.literal('payment_allocation'),
  id: z.string().min(1),
  amount: z.string(),
  invoice: z.strictObject({
    object: z.literal('invoice'),
    id: z.string().min(1),
    number: z.string(),
    totalAmount: z.string(),
    amountDue: z.string(),
    status: z.string(),
  }),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const PaymentSchema = z.strictObject({
  object: z.literal('payment'),
  id: z.string().min(1),
  number: z.string(),
  amount: z.string(),
  unappliedAmount: z.string(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED']),
  providerConnectionId: z.string().nullable().optional(),
  providerPaymentId: z.string().nullable().optional(),
  bankCharges: z.string(),
  currency: z.string(),
  paymentDate: z.number().int(),
  referenceNumber: z.string().nullable(),
  notes: z.string().nullable(),
  customer: z.strictObject({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  paymentMode: PaymentModeSchema,
  depositAccount: z.strictObject({
    object: z.literal('bank_account'),
    id: z.string().min(1),
    name: z.string(),
    accountType: BankAccountTypeSchema,
    currency: z.string(),
  }),
  invoiceAllocations: z.array(PaymentAllocationSchema),
  bankTransaction: BankTransactionSchema.nullable().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Payment>

export const TaxAuthorityListSchema = listSchema(
  TaxAuthoritySchema
) satisfies z.ZodType<List<TaxAuthority>>

export const TaxRateListSchema = listSchema(TaxRateSchema) satisfies z.ZodType<
  List<TaxRate>
>

export const BankAccountListSchema = listSchema(
  BankAccountSchema
) satisfies z.ZodType<List<BankAccount>>

export const BankTransactionListSchema = listSchema(
  BankTransactionSchema
) satisfies z.ZodType<List<BankTransaction>>

export const PaymentModeListSchema = listSchema(
  PaymentModeSchema
) satisfies z.ZodType<List<PaymentMode>>

export const PaymentListSchema = listSchema(PaymentSchema) satisfies z.ZodType<
  List<Payment>
>

const CustomerLedgerEntrySchema = z.object({
  object: z.literal('customer_ledger_entry'),
  id: z.string().min(1),
  type: z.string(),
  direction: z.enum(['DEBIT', 'CREDIT']),
  amount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  effectiveAt: z.number().int(),
  invoiceId: z.string().nullable(),
  paymentId: z.string().nullable(),
  creditNoteId: z.string().nullable(),
  refundId: z.string().nullable(),
})

export const CustomerAccountSchema = z.object({
  object: z.literal('customer_account'),
  customer: z.object({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  currency: z.string().nullable(),
  lifetimeBilled: z.string(),
  lifetimePaid: z.string(),
  outstandingReceivable: z.string(),
  availableCredit: z.string(),
  netPosition: z.string(),
  statement: z.array(CustomerLedgerEntrySchema),
}) satisfies z.ZodType<CustomerAccount>

const UpcomingInvoiceLineSchema = z.object({
  object: z.literal('upcoming_invoice_line'),
  kind: z.enum(['RECURRING', 'ONE_TIME']),
  subscriptionItemId: z.string().min(1).nullable(),
  subscriptionChargeId: z.string().min(1).nullable(),
  priceId: z.string().min(1).nullable(),
  description: z.string(),
  quantity: z.number().int(),
  unitAmount: z.string(),
  discountAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
})

export const UpcomingInvoiceSchema = z.object({
  object: z.literal('upcoming_invoice'),
  subscriptionId: z.string().min(1),
  customer: z.object({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  currency: z.string(),
  scheduledFor: z.number().int().nullable(),
  servicePeriodStart: z.number().int().nullable(),
  servicePeriodEnd: z.number().int().nullable(),
  subtotalAmount: z.string(),
  discountAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  lines: z.array(UpcomingInvoiceLineSchema),
}) satisfies z.ZodType<UpcomingInvoice>

export const ProrationPreviewSchema = z.object({
  object: z.literal('proration_preview'),
  error: z.string().nullable(),
  subscriptionId: z.string().optional(),
  currency: z.string().optional(),
  changeAt: z.number().int().optional(),
  periodStart: z.number().int().optional(),
  periodEnd: z.number().int().optional(),
  oldPeriodAmount: z.string().optional(),
  newPeriodAmount: z.string().optional(),
  unusedCredit: z.string().optional(),
  remainingCharge: z.string().optional(),
  netAmount: z.string().optional(),
  adjustment: z.enum(['INVOICE', 'CREDIT_NOTE', 'NONE']).optional(),
}) satisfies z.ZodType<ProrationPreview>

export const PaymentTermSchema = z.object({
  object: z.literal('payment_term'),
  id: z.string().min(1),
  name: z.string(),
  rule: z.enum([
    'DUE_ON_RECEIPT',
    'NET_DAYS',
    'END_OF_MONTH',
    'END_OF_NEXT_MONTH',
  ]),
  dueDays: z.number().int(),
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentTerm>

export const SalespersonSchema = z.object({
  object: z.literal('salesperson'),
  id: z.string().min(1),
  name: z.string(),
  email: z.string().nullable(),
  externalReference: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Salesperson>

export const CouponSchema = z.object({
  object: z.literal('coupon'),
  id: z.string().min(1),
  name: z.string(),
  productId: z.string().nullable(),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']),
  percentOff: z.string().nullable(),
  amountOff: z.string().nullable(),
  currency: z.string().nullable(),
  duration: z.enum(['ONCE', 'REPEATING', 'FOREVER']),
  durationInCycles: z.number().int().nullable(),
  redeemBy: z.number().int().nullable(),
  maxRedemptions: z.number().int().nullable(),
  maxRedemptionsPerCustomer: z.number().int().nullable(),
  discountPreference: z.enum(['INVOICE_LEVEL', 'ITEM_LEVEL']),
  appliesToAllPlans: z.boolean(),
  appliesToAllRecurringAddons: z.boolean(),
  appliesToAllOneTimeAddons: z.boolean(),
  eligibleForAllCustomers: z.boolean(),
  timesRedeemed: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Coupon>

export const PromotionCodeSchema = z.object({
  object: z.literal('promotion_code'),
  id: z.string().min(1),
  couponId: z.string().min(1),
  code: z.string(),
  customerId: z.string().nullable(),
  expiresAt: z.number().int().nullable(),
  maxRedemptions: z.number().int().nullable(),
  timesRedeemed: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PromotionCode>

export const PaymentProviderSchema = z.object({
  object: z.literal('payment_provider'),
  id: z.string().min(1),
  key: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  adapter: z.string(),
  isActive: z.boolean(),
}) satisfies z.ZodType<PaymentProvider>

export const PaymentProviderConnectionSchema = z.object({
  object: z.literal('payment_provider_connection'),
  id: z.string().min(1),
  providerId: z.string().min(1),
  name: z.string(),
  environment: z.enum(['SANDBOX', 'LIVE']),
  status: z.enum(['PENDING', 'ACTIVE', 'DISABLED', 'ERROR']),
  merchantAccountId: z.string().nullable(),
  lastSyncedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentProviderConnection>

export const PaymentTermListSchema = listSchema(PaymentTermSchema)
export const SalespersonListSchema = listSchema(SalespersonSchema)
export const CouponListSchema = listSchema(CouponSchema)
export const PromotionCodeListSchema = listSchema(PromotionCodeSchema)
export const PaymentProviderListSchema = listSchema(PaymentProviderSchema)
export const PaymentProviderConnectionListSchema = listSchema(
  PaymentProviderConnectionSchema
)

export function createdResourceSchema<const TObject extends string>(
  object: TObject
) {
  return z.strictObject({
    object: z.literal(object),
    id: z.string().min(1),
  })
}

function deletedResourceSchema<const TObject extends string>(object: TObject) {
  return z.strictObject({
    object: z.literal(object),
    id: z.string().min(1),
    deleted: z.literal(true),
  })
}

function listSchema<T>(itemSchema: z.ZodType<T>) {
  return z.strictObject({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
}
