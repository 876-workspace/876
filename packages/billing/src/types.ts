/** Client-safe error returned by 876 Billing. */
export interface Error {
  code: string
  message: string
  param?: string
}

/** Result envelope returned by every Billing client method. */
export type Result<T> = { data: T; error: null } | { data: null; error: Error }

/** Stripe-style list container returned by Billing collection endpoints. */
export interface List<T> {
  object: 'list'
  data: T[]
  has_more: boolean
  total_count: number | null
  url: string
}

/** Options shared by the tenant-scoped Billing client. */
export interface ClientOptions {
  /** Billing service origin. Defaults to same-origin in a browser. */
  baseUrl?: string
  /** Credentials mode used for 876 session cookies. */
  credentials?: RequestCredentials
  /** Optional fetch implementation for tests or custom runtimes. */
  fetch?: typeof fetch
  /** Optional request ID propagated to Billing logs. */
  requestId?: string
}

/** Optional per-request configuration. */
export interface RequestOptions {
  /** Optional signal used to abort the request. */
  signal?: AbortSignal
}

export type CustomerType = 'EXTERNAL' | 'CORE_USER' | 'CORE_ORGANIZATION'
export type CustomerKind = 'INDIVIDUAL' | 'BUSINESS'

/** Money represented in a currency's smallest unit. */
export type MinorAmount = number | string

/** JSON-safe provider configuration. Secrets must be external references. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/** Parameters for creating a tenant-owned Billing customer. */
export interface CustomerCreateParams {
  name: string
  customerKind?: CustomerKind
  salutation?: string | null
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  workPhone?: string | null
  currency?: string | null
  language?: string | null
  customerType?: CustomerType
  organizationId?: string | null
  userId?: string | null
  externalReference?: string | null
  paymentTermId?: string | null
  salespersonId?: string | null
  priceListId?: string | null
  taxBehaviorOverride?: TaxBehavior | null
  lateFeeExempt?: boolean
  invoiceNotes?: string | null
  invoiceTerms?: string | null
}

/** Minimal customer resource returned after creation. */
export interface CustomerCreated {
  object: 'customer'
  id: string
}

export interface CustomerOpeningBalanceParams {
  amount: MinorAmount
  currency: string
  asOf: number
  reference?: string | null
}

export interface CustomerLedgerEntry {
  object: 'customer_ledger_entry'
  id: string
  type: string
  direction: 'DEBIT' | 'CREDIT'
  amount: string
  currency: string
  description: string | null
  effectiveAt: number
  invoiceId: string | null
  paymentId: string | null
  creditNoteId: string | null
  refundId: string | null
}

export interface CustomerAccount {
  object: 'customer_account'
  customer: { object: 'customer'; id: string; name: string }
  currency: string | null
  lifetimeBilled: string
  lifetimePaid: string
  outstandingReceivable: string
  availableCredit: string
  netPosition: string
  statement: CustomerLedgerEntry[]
}

/** A snapshotted line used to create a quote or invoice. */
export interface DocumentLineCreateParams {
  itemId?: string | null
  priceId?: string | null
  description?: string | null
  quantity?: number
  unitAmount?: MinorAmount | null
  taxAmount?: MinorAmount
  discountAmount?: MinorAmount
}

/** Parameters for creating a draft invoice. */
export interface InvoiceCreateParams {
  quoteId?: string | null
  estimateId?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  salespersonId?: string | null
  priceListId?: string | null
  currency?: string
  issueAt?: number
  dueAt?: number
  orderNumber?: string | null
  referenceNumber?: string | null
  subject?: string | null
  taxBehavior?: TaxBehavior
  discountAmount?: MinorAmount
  shippingAmount?: MinorAmount
  adjustmentAmount?: MinorAmount
  notes?: string | null
  terms?: string | null
  lines?: DocumentLineCreateParams[]
}

export type TaxBehavior = 'EXCLUSIVE' | 'INCLUSIVE'
export type LateFeeCalculationType = 'PERCENTAGE' | 'FIXED'

export interface InvoicePreferenceUpdateParams {
  defaultTaxBehavior: TaxBehavior
  defaultNotes?: string | null
  defaultTerms?: string | null
  allowEditingSentInvoices: boolean
  lateFeesEnabled: boolean
  lateFeeCalculationType: LateFeeCalculationType
  lateFeePercent: number | null
  lateFeeAmount: MinorAmount | null
  lateFeeGraceDays: number
  lateFeeGenerateAsDraft: boolean
}

export interface InvoicePreference {
  object: 'invoice_preference'
  tenantId: string
  defaultTaxBehavior: TaxBehavior
  defaultNotes: string | null
  defaultTerms: string | null
  allowEditingSentInvoices: boolean
  lateFeesEnabled: boolean
  lateFeeCalculationType: LateFeeCalculationType
  lateFeePercent: string | null
  lateFeeAmount: string | null
  lateFeeGraceDays: number
  lateFeeGenerateAsDraft: boolean
  createdAt: number
  updatedAt: number
}

export interface InvoicePreferenceUpdated {
  object: 'invoice_preference'
  tenantId: string
}

export interface LateFeeRun {
  object: 'late_fee_run'
  created: number
  skipped: number
  hasMore: boolean
}

export interface InvoiceFinalizeParams {
  paymentTermId?: string | null
  salespersonId?: string | null
  autoApplyCredits?: boolean
}

export interface InvoiceVoidParams {
  reason?: string | null
}

/** Minimal invoice resource returned after creation. */
export interface InvoiceCreated {
  object: 'invoice'
  id: string
}

export type BankAccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'PAYPAL'
  | 'UNDEPOSITED_FUNDS'
  | 'PETTY_CASH'

export type BankTransactionType = 'CREDIT' | 'DEBIT'
export type BankTransactionStatus =
  | 'UNCATEGORIZED'
  | 'CATEGORIZED'
  | 'MATCHED'
  | 'EXCLUDED'

/** Parameters for creating a tenant-owned financial account. */
export interface BankAccountCreateParams {
  name: string
  accountType: BankAccountType
  currency: string
  description?: string | null
}

/** Mutable financial-account fields. */
export interface BankAccountUpdateParams {
  name?: string
  accountType?: BankAccountType
  currency?: string
  description?: string | null
  isActive?: boolean
}

export interface BankAccount {
  object: 'bank_account'
  id: string
  name: string
  accountType: BankAccountType
  currency: string
  description: string | null
  isActive: boolean
  balance: string
  createdAt: number
  updatedAt: number
}

export interface BankAccountCreated {
  object: 'bank_account'
  id: string
}

export interface BankAccountDeleted extends BankAccountCreated {
  deleted: true
}

/** Parameters for recording a manual bank transaction. */
export interface BankTransactionCreateParams {
  type: BankTransactionType
  amount: MinorAmount
  date: number
  description?: string | null
  reference?: string | null
}

/** Mutable fields on a manual bank transaction. */
export interface BankTransactionUpdateParams {
  type?: BankTransactionType
  amount?: MinorAmount
  date?: number
  description?: string | null
  status?: Exclude<BankTransactionStatus, 'MATCHED'>
  reference?: string | null
}

export interface BankTransaction {
  object: 'bank_transaction'
  id: string
  accountId: string
  paymentId: string | null
  type: BankTransactionType
  amount: string
  date: number
  description: string | null
  status: BankTransactionStatus
  reference: string | null
  createdAt: number
  updatedAt: number
}

export interface BankTransactionCreated {
  object: 'bank_transaction'
  id: string
}

export interface BankTransactionDeleted extends BankTransactionCreated {
  deleted: true
}

/** Parameters for creating a tenant payment mode. */
export interface PaymentModeCreateParams {
  name: string
  isDefault?: boolean
}

/** Mutable payment-mode fields. */
export interface PaymentModeUpdateParams {
  name?: string
  isDefault?: boolean
  isActive?: boolean
}

export interface PaymentMode {
  object: 'payment_mode'
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  isSystem: boolean
  createdAt: number
  updatedAt: number
}

export interface PaymentModeCreated {
  object: 'payment_mode'
  id: string
}

export interface PaymentModeDeleted extends PaymentModeCreated {
  deleted: true
}

export interface PaymentAllocationParams {
  invoiceId: string
  amount: MinorAmount
}

/** Parameters for recording or replacing a received payment. */
export interface PaymentCreateParams {
  customerId: string
  paymentModeId: string
  depositAccountId: string
  amount: MinorAmount
  bankCharges?: MinorAmount
  currency: string
  paymentDate: number
  referenceNumber?: string | null
  notes?: string | null
  allocations?: PaymentAllocationParams[]
}

export interface PaymentApplyParams {
  allocations: PaymentAllocationParams[]
}

export interface PaymentUpdateParams extends PaymentCreateParams {}

export interface PaymentAllocation {
  object: 'payment_allocation'
  id: string
  amount: string
  invoice: {
    object: 'invoice'
    id: string
    number: string
    totalAmount: string
    amountDue: string
    status: string
  }
  createdAt: number
  updatedAt: number
}

export interface Payment {
  object: 'payment'
  id: string
  number: string
  amount: string
  unappliedAmount: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'
  providerConnectionId?: string | null
  providerPaymentId?: string | null
  bankCharges: string
  currency: string
  paymentDate: number
  referenceNumber: string | null
  notes: string | null
  customer: {
    object: 'customer'
    id: string
    name: string
  }
  paymentMode: PaymentMode
  depositAccount: Pick<
    BankAccount,
    'object' | 'id' | 'name' | 'accountType' | 'currency'
  >
  invoiceAllocations: PaymentAllocation[]
  bankTransaction?: BankTransaction | null
  createdAt: number
  updatedAt: number
}

export interface PaymentCreated {
  object: 'payment'
  id: string
}

export interface PaymentDeleted extends PaymentCreated {
  deleted: true
}

export type SubscriptionStatus =
  | 'DRAFT'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELED'
  | 'ENDED'

/** A recurring price attached to a new subscription. */
export interface SubscriptionItemCreateParams {
  priceId: string
  quantity?: number
}

/** Parameters for creating a tenant-owned commercial subscription. */
export interface SubscriptionCreateParams {
  customerId: string
  items: SubscriptionItemCreateParams[]
  status?: SubscriptionStatus
  startAt?: number
  sourceAppId?: string | null
  externalReference?: string | null
  billingCycleAnchor?: number
  collectionMethod?: 'SEND_INVOICE' | 'AUTO_CHARGE'
  billingTiming?: 'IN_ADVANCE' | 'IN_ARREARS'
  prorationBehavior?: 'CREATE_PRORATIONS' | 'NONE' | 'ALWAYS_INVOICE'
  paymentTermId?: string | null
  autoApplyCredits?: boolean
  taxBehavior?: TaxBehavior
  invoiceModeOverride?: 'AUTO_FINALIZE' | 'DRAFT' | null
  renewalPricingPolicy?:
    | 'RETAIN_EXISTING'
    | 'USE_LATEST'
    | 'MARKUP'
    | 'MARKDOWN'
  renewalAdjustmentPercent?: number | null
  lockActivationPrices?: boolean
  remainingCycles?: number | null
  priceListId?: string | null
  advanceBillingEnabled?: boolean | null
  advanceBillingDays?: number | null
  promotionCode?: string | null
}

/** Minimal subscription resource returned after creation. */
export interface SubscriptionCreated {
  object: 'subscription'
  id: string
}

export type * from './subscription-lifecycle-types'

export interface SubscriptionProrationPreviewParams {
  changeAt: number
  items: SubscriptionItemCreateParams[]
}

export interface SubscriptionManualInvoiceParams {
  advance?: boolean
  draft?: boolean
}

export interface UpcomingInvoiceLine {
  object: 'upcoming_invoice_line'
  kind: 'RECURRING' | 'ONE_TIME'
  subscriptionItemId: string | null
  subscriptionChargeId: string | null
  priceId: string | null
  description: string
  quantity: number
  unitAmount: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
}

export interface UpcomingInvoice {
  object: 'upcoming_invoice'
  subscriptionId: string
  customer: { object: 'customer'; id: string; name: string }
  currency: string
  scheduledFor: number | null
  servicePeriodStart: number | null
  servicePeriodEnd: number | null
  subtotalAmount: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  lines: UpcomingInvoiceLine[]
}

export interface ProrationPreview {
  object: 'proration_preview'
  error: string | null
  subscriptionId?: string
  currency?: string
  changeAt?: number
  periodStart?: number
  periodEnd?: number
  oldPeriodAmount?: string
  newPeriodAmount?: string
  unusedCredit?: string
  remainingCharge?: string
  netAmount?: string
  adjustment?: 'INVOICE' | 'CREDIT_NOTE' | 'NONE'
}

export interface PaymentTermCreateParams {
  name: string
  rule: 'DUE_ON_RECEIPT' | 'NET_DAYS' | 'END_OF_MONTH' | 'END_OF_NEXT_MONTH'
  dueDays?: number
  isDefault?: boolean
}

export interface PaymentTerm {
  object: 'payment_term'
  id: string
  name: string
  rule: PaymentTermCreateParams['rule']
  dueDays: number
  isDefault: boolean
  isSystem: boolean
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface SalespersonCreateParams {
  name: string
  email?: string | null
  externalReference?: string | null
}

export interface Salesperson {
  object: 'salesperson'
  id: string
  name: string
  email: string | null
  externalReference: string | null
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface CouponCreateParams {
  name: string
  code?: string | null
  productId?: string | null
  percentOff?: number | null
  amountOff?: MinorAmount | null
  currency?: string | null
  duration: 'ONCE' | 'REPEATING' | 'FOREVER'
  durationInCycles?: number | null
  redeemBy?: number | null
  maxRedemptions?: number | null
  maxRedemptionsPerCustomer?: number | null
  discountPreference?: 'INVOICE_LEVEL' | 'ITEM_LEVEL'
  appliesToAllPlans?: boolean
  appliesToAllRecurringAddons?: boolean
  appliesToAllOneTimeAddons?: boolean
  eligibleForAllCustomers?: boolean
  planIds?: string[]
  addonIds?: string[]
  customerIds?: string[]
  currencyAmounts?: Array<{ currency: string; amountOff: MinorAmount }>
}

export interface CouponUpdateParams {
  name?: string
  redeemBy?: number | null
  maxRedemptions?: number | null
  isActive?: boolean
}

export interface CouponCreated {
  object: 'coupon'
  id: string
}

export interface CouponDeleted extends CouponCreated {
  deleted: true
}

export interface Coupon {
  object: 'coupon'
  id: string
  name: string
  productId: string | null
  discountType: 'PERCENTAGE' | 'AMOUNT'
  percentOff: string | null
  amountOff: string | null
  currency: string | null
  duration: CouponCreateParams['duration']
  durationInCycles: number | null
  redeemBy: number | null
  maxRedemptions: number | null
  maxRedemptionsPerCustomer: number | null
  discountPreference: 'INVOICE_LEVEL' | 'ITEM_LEVEL'
  appliesToAllPlans: boolean
  appliesToAllRecurringAddons: boolean
  appliesToAllOneTimeAddons: boolean
  eligibleForAllCustomers: boolean
  timesRedeemed: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export type ItemType = 'GOOD' | 'SERVICE'
export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
export type PriceType = 'ONE_TIME' | 'RECURRING'
export type PricingModel = 'FLAT' | 'PER_UNIT' | 'VOLUME' | 'TIERED' | 'PACKAGE'

export interface ProductCreateParams {
  slug: string
  name: string
  description?: string | null
  type?: ItemType
  sourceAppId?: string | null
  notificationRecipients?: string | null
  redirectUrl?: string | null
}

export interface ProductUpdateParams {
  name?: string
  description?: string | null
  type?: ItemType
  notificationRecipients?: string | null
  redirectUrl?: string | null
  fallbackPlanId?: string | null
  isActive?: boolean
}

export interface PlanCreateParams {
  productId: string
  code: string
  name: string
  description?: string | null
  imageUrl?: string | null
  unitName?: string | null
  taxCode?: string | null
  entitlementReferenceId?: string | null
  intervalUnit: IntervalUnit
  intervalCount?: number
  billingCycleCount?: number | null
  trialDays?: number
  setupFeeAmount?: MinorAmount | null
  setupFeeCurrency?: string | null
  isTaxable?: boolean
  isFree?: boolean
  showInCheckout?: boolean
}

export interface PlanUpdateParams {
  name?: string
  description?: string | null
  imageUrl?: string | null
  unitName?: string | null
  taxCode?: string | null
  trialDays?: number
  setupFeeAmount?: MinorAmount | null
  setupFeeCurrency?: string | null
  isTaxable?: boolean
  isFree?: boolean
  showInCheckout?: boolean
  isActive?: boolean
}

export interface PriceTierCreateParams {
  fromUnit: number
  toUnit?: number | null
  unitAmount?: MinorAmount | null
  flatAmount?: MinorAmount | null
}

export interface PriceCreateParams {
  itemId?: string | null
  planId?: string | null
  addonId?: string | null
  nickname?: string | null
  entitlementReferenceId?: string | null
  currency: string
  unitAmount?: MinorAmount | null
  pricingModel?: PricingModel
  priceType?: PriceType
  intervalUnit?: IntervalUnit | null
  intervalCount?: number | null
  unitName?: string | null
  packageSize?: number | null
  isTaxable?: boolean
  tiers?: PriceTierCreateParams[]
}

export interface PriceUpdateParams {
  nickname?: string | null
  isActive?: boolean
}

export type AddonAssociationType = 'OPTIONAL' | 'RECOMMENDED' | 'MANDATORY'
export type AddonAssociationEvent =
  | 'SUBSCRIPTION_ACTIVATION'
  | 'PLAN_CHANGE'
  | 'TRIAL_ACTIVATION'
export type AddonAssociationFrequency = 'EVERY_OCCURRENCE' | 'FIRST_OCCURRENCE'

export interface AddonAssociationUpsertParams {
  planId: string
  associationType?: AddonAssociationType
  events?: AddonAssociationEvent[]
  frequency?: AddonAssociationFrequency
  isActive?: boolean
}

export interface AddonAssociationBatchResult {
  object: 'plan_addon_association_batch'
  id: string
  updated: number
}

export interface AddonPriceCreateParams {
  currency: string
  unitAmount?: MinorAmount | null
  pricingModel?: PricingModel
  unitName?: string | null
  packageSize?: number | null
  tiers?: PriceTierCreateParams[]
}

export interface AddonCreateParams {
  productId: string
  code: string
  name: string
  description?: string | null
  imageUrl?: string | null
  type?: ItemType
  priceType?: PriceType
  intervalUnit?: IntervalUnit | null
  intervalCount?: number | null
  unitName?: string | null
  taxCode?: string | null
  isTaxable?: boolean
  showInCheckout?: boolean
  allowPortalManagement?: boolean
  price?: AddonPriceCreateParams | null
  associations?: AddonAssociationUpsertParams[]
}

export interface AddonUpdateParams {
  name?: string
  description?: string | null
  imageUrl?: string | null
  unitName?: string | null
  taxCode?: string | null
  isTaxable?: boolean
  showInCheckout?: boolean
  allowPortalManagement?: boolean
  isActive?: boolean
}

export interface PriceListEntryCreateParams {
  priceId: string
  unitAmount?: MinorAmount | null
  tiers?: Array<{
    fromUnit: number
    toUnit?: number | null
    unitAmount: MinorAmount
  }>
}

export interface PriceListCreateParams {
  name: string
  description?: string | null
  mode: 'PERCENTAGE' | 'CUSTOM'
  direction?: 'MARKUP' | 'MARKDOWN' | null
  percentage?: number | null
  currency?: string | null
  rounding?: 'NONE' | 'NEAREST' | 'UP' | 'DOWN'
  roundingPrecision?: number
  entries?: PriceListEntryCreateParams[]
}

export interface PriceListUpdateParams {
  name?: string
  description?: string | null
  isActive?: boolean
}

export interface CatalogCloneParams {
  code: string
  name: string
}

export interface CatalogResource extends Record<string, unknown> {
  object: 'product' | 'plan' | 'price' | 'addon' | 'price_list'
  id: string
}

export interface CatalogCreated {
  object:
    | 'product'
    | 'plan'
    | 'price'
    | 'addon'
    | 'price_list'
    | 'plan_addon_association'
  id: string
}

export interface CatalogDeleted extends CatalogCreated {
  deleted: true
}

export interface ResolvedPrice {
  object: 'resolved_price'
  currency: string
  amount: string
  price_list_id: string | null
}

export interface PromotionCodeCreateParams {
  couponId: string
  code: string
  customerId?: string | null
  expiresAt?: number | null
  maxRedemptions?: number | null
}

export interface PromotionCode {
  object: 'promotion_code'
  id: string
  couponId: string
  code: string
  customerId: string | null
  expiresAt: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface PaymentProvider {
  object: 'payment_provider'
  id: string
  key: string
  name: string
  logoUrl: string | null
  adapter: string
  isActive: boolean
}

export interface PaymentProviderConnectionCreateParams {
  providerId: string
  name: string
  environment?: 'SANDBOX' | 'LIVE'
  merchantAccountId?: string | null
  credentialsReference?: string | null
  webhookSecretReference?: string | null
  settings?: Record<string, JsonValue> | null
}

export interface PaymentProviderConnectionUpdateParams {
  name?: string
  status?: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ERROR'
  merchantAccountId?: string | null
  credentialsReference?: string | null
  webhookSecretReference?: string | null
  settings?: Record<string, JsonValue> | null
}

export interface PaymentProviderConnection {
  object: 'payment_provider_connection'
  id: string
  providerId: string
  name: string
  environment: 'SANDBOX' | 'LIVE'
  status: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ERROR'
  merchantAccountId: string | null
  lastSyncedAt: number | null
  createdAt: number
  updatedAt: number
}

/** Parameters for creating a tenant tax authority. */
export interface TaxAuthorityCreateParams {
  name: string
  description?: string | null
  countryCode?: string
  subdivisionCode?: string | null
  isDefault?: boolean
}

/** Mutable tax-authority fields. */
export interface TaxAuthorityUpdateParams {
  name?: string
  description?: string | null
  countryCode?: string
  subdivisionCode?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export interface TaxAuthority {
  object: 'tax_authority'
  id: string
  name: string
  description: string | null
  countryCode: string
  subdivisionCode: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface TaxAuthorityCreated {
  object: 'tax_authority'
  id: string
}

/** Parameters for creating an immutable effective-dated tax rate. */
export interface TaxRateCreateParams {
  name: string
  description?: string | null
  taxType?: string | null
  rate: number | string
  taxAuthorityId?: string | null
  inclusive?: boolean
  startsAt?: number | null
}

export interface TaxRateUpdateParams {
  isActive: boolean
}

export interface TaxRate {
  object: 'tax_rate'
  id: string
  name: string
  description: string | null
  taxType: string | null
  rate: string
  inclusive: boolean
  startsAt: number | null
  isActive: boolean
  taxAuthority: TaxAuthority
  createdAt: number
  updatedAt: number
}

export interface TaxRateCreated {
  object: 'tax_rate'
  id: string
}
