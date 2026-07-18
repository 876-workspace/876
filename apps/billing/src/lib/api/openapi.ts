import { z } from 'zod'

import {
  CustomerCreateSchema,
  CustomerOpeningBalanceSchema,
  CustomerUpdateSchema,
} from '@/types/customer'
import {
  BankAccountCreateSchema,
  BankAccountUpdateSchema,
  BankTransactionCreateSchema,
  BankTransactionUpdateSchema,
} from '@/types/banking'
import { TenantCurrencyEnableSchema } from '@/types/currency'
import {
  InvoiceCreateSchema,
  InvoiceFinalizeSchema,
  InvoiceUpdateSchema,
  InvoiceVoidSchema,
} from '@/types/invoice'
import { InvoicePreferenceUpdateSchema } from '@/types/invoice-preference'
import { ItemCreateSchema, ItemUpdateSchema } from '@/types/item'
import {
  PaymentCreateSchema,
  PaymentApplySchema,
  PaymentModeCreateSchema,
  PaymentModeUpdateSchema,
  PaymentUpdateSchema,
} from '@/types/payment'
import {
  BillingSweepSchema,
  SubscriptionAmendmentCreateSchema,
  SubscriptionBulkInvoiceModeSchema,
  SubscriptionCancelSchema,
  SubscriptionChargeCreateSchema,
  SubscriptionCreateSchema,
  SubscriptionCustomViewCreateSchema,
  SubscriptionDiscountCreateSchema,
  SubscriptionExtendSchema,
  SubscriptionManualInvoiceSchema,
  SubscriptionPauseSchema,
  SubscriptionPreferenceUpdateSchema,
  SubscriptionProrationPreviewSchema,
  SubscriptionReactivateSchema,
  SubscriptionResumeSchema,
} from '@/types/subscription'
import { PaymentTermCreateSchema } from '@/types/payment-term'
import { SalespersonCreateSchema } from '@/types/salesperson'
import { CouponCreateSchema, PromotionCodeCreateSchema } from '@/types/discount'
import { CouponUpdateSchema } from '@/types/discount'
import { ProductCreateSchema, ProductUpdateSchema } from '@/types/product'
import {
  PlanCloneSchema,
  PlanCreateSchema,
  PlanUpdateSchema,
} from '@/types/plan'
import { PriceCreateSchema, PriceUpdateSchema } from '@/types/price'
import {
  AddonAssociationMutationSchema,
  AddonCloneSchema,
  AddonCreateSchema,
  AddonUpdateSchema,
} from '@/types/addon'
import {
  PriceListCreateSchema,
  PriceListResolveSchema,
  PriceListUpdateSchema,
} from '@/types/price-list'
import {
  PaymentProviderConnectionCreateSchema,
  PaymentProviderConnectionUpdateSchema,
} from '@/types/payment-provider'
import {
  MemberUpdateSchema,
  RoleCreateSchema,
  RoleUpdateSchema,
} from '@/types/access'
import {
  TaxAuthorityCreateSchema,
  TaxAuthorityUpdateSchema,
  TaxRateCreateSchema,
  TaxRateUpdateSchema,
} from '@/types/tax'
import {
  CustomerEnsureSchema,
  PlanEnsureSchema,
  PriceEnsureSchema,
  ProductEnsureSchema,
  SubscriptionEnsureSchema,
} from '@/types/sync'

const oauthIssuer = (
  process.env.BILLING_OAUTH_ISSUER ??
  process.env.API_URL ??
  'http://localhost:4000'
).replace(/\/$/, '')

const requestSchemas = {
  BankAccountCreateParams: toOpenApiSchema(BankAccountCreateSchema),
  BankAccountUpdateParams: toOpenApiSchema(BankAccountUpdateSchema),
  BankTransactionCreateParams: toOpenApiSchema(BankTransactionCreateSchema),
  BankTransactionUpdateParams: toOpenApiSchema(BankTransactionUpdateSchema),
  CustomerCreateParams: toOpenApiSchema(CustomerCreateSchema),
  CustomerUpdateParams: toOpenApiSchema(CustomerUpdateSchema),
  CustomerOpeningBalanceParams: toOpenApiSchema(CustomerOpeningBalanceSchema),
  InvoiceCreateParams: toOpenApiSchema(InvoiceCreateSchema),
  InvoiceFinalizeParams: toOpenApiSchema(InvoiceFinalizeSchema),
  InvoiceUpdateParams: toOpenApiSchema(InvoiceUpdateSchema),
  InvoiceVoidParams: toOpenApiSchema(InvoiceVoidSchema),
  ItemCreateParams: toOpenApiSchema(ItemCreateSchema),
  ItemUpdateParams: toOpenApiSchema(ItemUpdateSchema),
  InvoicePreferenceUpdateParams: toOpenApiSchema(InvoicePreferenceUpdateSchema),
  SubscriptionCreateParams: toOpenApiSchema(SubscriptionCreateSchema),
  SubscriptionManualInvoiceParams: toOpenApiSchema(
    SubscriptionManualInvoiceSchema
  ),
  SubscriptionPauseParams: toOpenApiSchema(SubscriptionPauseSchema),
  SubscriptionResumeParams: toOpenApiSchema(SubscriptionResumeSchema),
  SubscriptionCancelParams: toOpenApiSchema(SubscriptionCancelSchema),
  SubscriptionReactivateParams: toOpenApiSchema(SubscriptionReactivateSchema),
  SubscriptionExtendParams: toOpenApiSchema(SubscriptionExtendSchema),
  SubscriptionAmendmentCreateParams: toOpenApiSchema(
    SubscriptionAmendmentCreateSchema
  ),
  SubscriptionChargeCreateParams: toOpenApiSchema(
    SubscriptionChargeCreateSchema
  ),
  SubscriptionDiscountCreateParams: toOpenApiSchema(
    SubscriptionDiscountCreateSchema
  ),
  SubscriptionPreferenceUpdateParams: toOpenApiSchema(
    SubscriptionPreferenceUpdateSchema
  ),
  SubscriptionBulkInvoiceModeParams: toOpenApiSchema(
    SubscriptionBulkInvoiceModeSchema
  ),
  SubscriptionCustomViewCreateParams: toOpenApiSchema(
    SubscriptionCustomViewCreateSchema
  ),
  SubscriptionProrationPreviewParams: toOpenApiSchema(
    SubscriptionProrationPreviewSchema
  ),
  BillingSweepParams: toOpenApiSchema(BillingSweepSchema),
  TenantCurrencyEnableParams: toOpenApiSchema(TenantCurrencyEnableSchema),
  TaxAuthorityCreateParams: toOpenApiSchema(TaxAuthorityCreateSchema),
  TaxAuthorityUpdateParams: toOpenApiSchema(TaxAuthorityUpdateSchema),
  TaxRateCreateParams: toOpenApiSchema(TaxRateCreateSchema),
  TaxRateUpdateParams: toOpenApiSchema(TaxRateUpdateSchema),
  RoleCreateParams: toOpenApiSchema(RoleCreateSchema),
  RoleUpdateParams: toOpenApiSchema(RoleUpdateSchema),
  MemberUpdateParams: toOpenApiSchema(MemberUpdateSchema),
  PaymentCreateParams: toOpenApiSchema(PaymentCreateSchema),
  PaymentUpdateParams: toOpenApiSchema(PaymentUpdateSchema),
  PaymentApplyParams: toOpenApiSchema(PaymentApplySchema),
  PaymentModeCreateParams: toOpenApiSchema(PaymentModeCreateSchema),
  PaymentModeUpdateParams: toOpenApiSchema(PaymentModeUpdateSchema),
  ProductEnsureParams: toOpenApiSchema(ProductEnsureSchema),
  PlanEnsureParams: toOpenApiSchema(PlanEnsureSchema),
  PriceEnsureParams: toOpenApiSchema(PriceEnsureSchema),
  CustomerEnsureParams: toOpenApiSchema(CustomerEnsureSchema),
  SubscriptionEnsureParams: toOpenApiSchema(SubscriptionEnsureSchema),
  PaymentTermCreateParams: toOpenApiSchema(PaymentTermCreateSchema),
  SalespersonCreateParams: toOpenApiSchema(SalespersonCreateSchema),
  CouponCreateParams: toOpenApiSchema(CouponCreateSchema),
  CouponUpdateParams: toOpenApiSchema(CouponUpdateSchema),
  PromotionCodeCreateParams: toOpenApiSchema(PromotionCodeCreateSchema),
  ProductCreateParams: toOpenApiSchema(ProductCreateSchema),
  ProductUpdateParams: toOpenApiSchema(ProductUpdateSchema),
  PlanCreateParams: toOpenApiSchema(PlanCreateSchema),
  PlanUpdateParams: toOpenApiSchema(PlanUpdateSchema),
  PlanCloneParams: toOpenApiSchema(PlanCloneSchema),
  PriceCreateParams: toOpenApiSchema(PriceCreateSchema),
  PriceUpdateParams: toOpenApiSchema(PriceUpdateSchema),
  AddonCreateParams: toOpenApiSchema(AddonCreateSchema),
  AddonUpdateParams: toOpenApiSchema(AddonUpdateSchema),
  AddonCloneParams: toOpenApiSchema(AddonCloneSchema),
  AddonAssociationMutationParams: toOpenApiSchema(
    AddonAssociationMutationSchema
  ),
  PriceListCreateParams: toOpenApiSchema(PriceListCreateSchema),
  PriceListUpdateParams: toOpenApiSchema(PriceListUpdateSchema),
  PriceListResolveParams: toOpenApiSchema(PriceListResolveSchema),
  PaymentProviderConnectionCreateParams: toOpenApiSchema(
    PaymentProviderConnectionCreateSchema
  ),
  PaymentProviderConnectionUpdateParams: toOpenApiSchema(
    PaymentProviderConnectionUpdateSchema
  ),
}

const integrationRequestSchemas = {
  IntegrationCustomerCreateParams: withIntegrationSourceReference(
    requestSchemas.CustomerCreateParams
  ),
  IntegrationInvoiceCreateParams: withIntegrationSourceReference(
    requestSchemas.InvoiceCreateParams
  ),
  IntegrationItemCreateParams: withIntegrationSourceReference(
    requestSchemas.ItemCreateParams
  ),
  IntegrationPaymentCreateParams: withIntegrationSourceReference(
    requestSchemas.PaymentCreateParams
  ),
}

/** Machine-readable contract for the versioned 876 Billing integration API. */
export const OpenApiDocument = {
  openapi: '3.1.0',
  info: {
    title: '876 Billing API',
    version: '1.0.0',
    description:
      'Tenant-scoped commercial billing resources and the server-only projection surface used by 876 Console.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Currencies' },
    { name: 'Customers' },
    { name: 'Invoices' },
    { name: 'Banking' },
    { name: 'Payments' },
    { name: 'Subscriptions' },
    { name: 'Catalog' },
    { name: 'Discounts' },
    { name: 'Payment providers' },
    { name: 'Taxes' },
    { name: 'Access' },
    { name: 'Admin sync' },
    {
      name: 'Organization integrations',
      description:
        'Official organization-scoped interface for trusted 876 services and delegated third-party applications.',
    },
  ],
  paths: {
    '/banking/accounts': {
      get: listPath('Banking', 'List financial accounts', 'bank_account'),
      post: createPath(
        'Banking',
        'Create a financial account',
        'BankAccountCreateParams',
        'bank_account'
      ),
    },
    '/banking/accounts/{accountId}': {
      get: retrievePath(
        'Banking',
        'Retrieve a financial account',
        'bank_account',
        pathParameter('accountId')
      ),
      patch: updatePath(
        'Banking',
        'Update a financial account',
        'BankAccountUpdateParams',
        'bank_account',
        pathParameter('accountId')
      ),
      delete: deletePath(
        'Banking',
        'Delete an unused financial account',
        'bank_account',
        pathParameter('accountId')
      ),
    },
    '/banking/accounts/{accountId}/transactions': {
      get: {
        ...listPath('Banking', 'List account transactions', 'bank_transaction'),
        parameters: [pathParameter('accountId')],
      },
      post: {
        ...createPath(
          'Banking',
          'Create a manual account transaction',
          'BankTransactionCreateParams',
          'bank_transaction'
        ),
        parameters: [pathParameter('accountId')],
      },
    },
    '/banking/accounts/{accountId}/transactions/{transactionId}': {
      get: {
        ...retrievePath(
          'Banking',
          'Retrieve an account transaction',
          'bank_transaction',
          pathParameter('transactionId')
        ),
        parameters: [
          pathParameter('accountId'),
          pathParameter('transactionId'),
        ],
      },
      patch: {
        ...updatePath(
          'Banking',
          'Update a manual account transaction',
          'BankTransactionUpdateParams',
          'bank_transaction'
        ),
        parameters: [
          pathParameter('accountId'),
          pathParameter('transactionId'),
        ],
      },
      delete: {
        ...deletePath(
          'Banking',
          'Delete a manual account transaction',
          'bank_transaction',
          pathParameter('transactionId')
        ),
        parameters: [
          pathParameter('accountId'),
          pathParameter('transactionId'),
        ],
      },
    },
    '/payments/modes': {
      get: listPath('Payments', 'List payment modes', 'payment_mode'),
      post: createPath(
        'Payments',
        'Create a payment mode',
        'PaymentModeCreateParams',
        'payment_mode'
      ),
    },
    '/payments/modes/{modeId}': {
      get: retrievePath(
        'Payments',
        'Retrieve a payment mode',
        'payment_mode',
        pathParameter('modeId')
      ),
      patch: updatePath(
        'Payments',
        'Update a payment mode',
        'PaymentModeUpdateParams',
        'payment_mode',
        pathParameter('modeId')
      ),
      delete: deletePath(
        'Payments',
        'Delete an unused payment mode',
        'payment_mode',
        pathParameter('modeId')
      ),
    },
    '/payments': {
      get: listPath('Payments', 'List received payments', 'payment'),
      post: createPath(
        'Payments',
        'Record a received payment',
        'PaymentCreateParams',
        'payment'
      ),
    },
    '/payments/{paymentId}': {
      get: retrievePath(
        'Payments',
        'Retrieve a received payment',
        'payment',
        pathParameter('paymentId')
      ),
      patch: updatePath(
        'Payments',
        'Replace a received payment and its allocations',
        'PaymentUpdateParams',
        'payment',
        pathParameter('paymentId')
      ),
      delete: deletePath(
        'Payments',
        'Delete and reverse a received payment',
        'payment',
        pathParameter('paymentId')
      ),
    },
    '/payments/{paymentId}/apply': {
      post: {
        ...createPath(
          'Payments',
          'Apply unapplied payment cash to invoices',
          'PaymentApplyParams',
          'payment'
        ),
        parameters: [pathParameter('paymentId')],
      },
    },
    '/currencies': {
      get: listPath('Currencies', 'List enabled currencies', 'currency'),
      post: createPath(
        'Currencies',
        'Enable a supported currency',
        'TenantCurrencyEnableParams',
        'tenant_currency'
      ),
      patch: updatePath(
        'Currencies',
        'Set the default currency',
        'TenantCurrencyEnableParams',
        'tenant_currency'
      ),
    },
    '/customers': {
      post: {
        tags: ['Customers'],
        summary: 'Create a billing customer',
        security: [{ Session: [] }],
        requestBody: jsonBody('CustomerCreateParams'),
        responses: createdResponse('customer'),
      },
    },
    '/customers/{customerId}/account': {
      get: retrievePath(
        'Customers',
        'Retrieve customer account totals and statement',
        'customer_account',
        pathParameter('customerId')
      ),
    },
    '/customers/{customerId}/opening-balance': {
      post: {
        ...createPath(
          'Customers',
          'Record a dated customer opening balance',
          'CustomerOpeningBalanceParams',
          'invoice'
        ),
        parameters: [pathParameter('customerId')],
      },
    },
    '/invoices': {
      post: {
        tags: ['Invoices'],
        summary: 'Create a draft invoice',
        security: [{ Session: [] }],
        requestBody: jsonBody('InvoiceCreateParams'),
        responses: createdResponse('invoice'),
      },
    },
    '/invoices/{invoiceId}/finalize': {
      post: {
        ...createPath(
          'Invoices',
          'Finalize an invoice and post its receivable',
          'InvoiceFinalizeParams',
          'invoice'
        ),
        parameters: [pathParameter('invoiceId')],
      },
    },
    '/invoices/{invoiceId}/void': {
      post: {
        ...createPath(
          'Invoices',
          'Void an unsettled finalized invoice',
          'InvoiceVoidParams',
          'invoice'
        ),
        parameters: [pathParameter('invoiceId')],
      },
    },
    '/invoice-preferences': {
      get: retrievePathWithoutParameter(
        'Invoices',
        'Retrieve invoice and late-fee preferences',
        'invoice_preference'
      ),
      patch: updatePath(
        'Invoices',
        'Update invoice and late-fee preferences',
        'InvoicePreferenceUpdateParams',
        'invoice_preference'
      ),
    },
    '/invoice-preferences/assess-late-fees': {
      post: actionPath(
        'Invoices',
        'Assess eligible overdue invoices using the current late-fee policy',
        'late_fee_run'
      ),
    },
    '/subscriptions': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Create a commercial subscription',
        security: [{ Session: [] }],
        requestBody: jsonBody('SubscriptionCreateParams'),
        responses: createdResponse('subscription'),
      },
    },
    '/subscriptions/{subscriptionId}/bill': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Idempotently invoice a due subscription period',
        security: [{ Session: [] }],
        parameters: [pathParameter('subscriptionId')],
        requestBody: jsonBody('SubscriptionManualInvoiceParams'),
        responses: acknowledgementResponse('invoice'),
      },
    },
    '/subscriptions/{subscriptionId}': {
      delete: deletePath(
        'Subscriptions',
        'Soft-delete a subscription while retaining financial history',
        'subscription',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/pause': {
      post: actionWithBodyPath(
        'Subscriptions',
        'Pause a subscription now or on a future date',
        'SubscriptionPauseParams',
        'subscription_schedule',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/resume': {
      post: actionWithBodyPath(
        'Subscriptions',
        'Resume a paused subscription',
        'SubscriptionResumeParams',
        'subscription_schedule',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/cancel': {
      post: actionWithBodyPath(
        'Subscriptions',
        'Cancel a subscription now, at renewal, or on a future date',
        'SubscriptionCancelParams',
        'subscription_schedule',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/reactivate': {
      post: actionWithBodyPath(
        'Subscriptions',
        'Reactivate a cancellation or create a successor subscription',
        'SubscriptionReactivateParams',
        'subscription',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/extend': {
      post: actionWithBodyPath(
        'Subscriptions',
        'Extend the remaining subscription term',
        'SubscriptionExtendParams',
        'subscription',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/amendments': {
      post: actionWithBodyPath(
        'Subscriptions',
        'Apply or schedule a subscription composition and terms change',
        'SubscriptionAmendmentCreateParams',
        'subscription_amendment',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/charges': {
      get: {
        ...listPath(
          'Subscriptions',
          'List one-time charges for a subscription',
          'subscription_charge'
        ),
        parameters: [pathParameter('subscriptionId')],
      },
      post: actionWithBodyPath(
        'Subscriptions',
        'Add a one-time subscription charge',
        'SubscriptionChargeCreateParams',
        'subscription_charge',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/charges/{chargeId}': {
      delete: deletePath(
        'Subscriptions',
        'Void an unbilled subscription charge',
        'subscription_charge',
        pathParameter('subscriptionId'),
        pathParameter('chargeId')
      ),
    },
    '/subscriptions/{subscriptionId}/discounts': {
      get: {
        ...listPath(
          'Subscriptions',
          'List discounts applied to a subscription',
          'subscription_discount'
        ),
        parameters: [pathParameter('subscriptionId')],
      },
      post: actionWithBodyPath(
        'Subscriptions',
        'Apply a coupon or manual subscription discount',
        'SubscriptionDiscountCreateParams',
        'subscription_discount',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/discounts/{discountId}': {
      delete: deletePath(
        'Subscriptions',
        'End an active subscription discount',
        'subscription_discount',
        pathParameter('subscriptionId'),
        pathParameter('discountId')
      ),
    },
    '/subscription-preferences': {
      get: retrievePathWithoutParameter(
        'Subscriptions',
        'Retrieve subscription defaults and automation settings',
        'subscription_preferences'
      ),
      patch: updatePath(
        'Subscriptions',
        'Update subscription defaults and automation settings',
        'SubscriptionPreferenceUpdateParams',
        'subscription_preferences'
      ),
    },
    '/subscription-preferences/invoice-modes': {
      patch: updatePath(
        'Subscriptions',
        'Bulk update per-subscription invoice modes',
        'SubscriptionBulkInvoiceModeParams',
        'subscription_bulk_update'
      ),
    },
    '/subscription-views': {
      get: listPath(
        'Subscriptions',
        'List reusable subscription views',
        'subscription_view'
      ),
      post: createPath(
        'Subscriptions',
        'Create a reusable subscription view',
        'SubscriptionCustomViewCreateParams',
        'subscription_view'
      ),
    },
    '/subscription-views/{viewId}': {
      put: updatePath(
        'Subscriptions',
        'Update a reusable subscription view',
        'SubscriptionCustomViewCreateParams',
        'subscription_view',
        pathParameter('viewId')
      ),
      delete: deletePath(
        'Subscriptions',
        'Delete a reusable subscription view',
        'subscription_view',
        pathParameter('viewId')
      ),
    },
    '/subscriptions/{subscriptionId}/upcoming-invoice': {
      get: retrievePath(
        'Subscriptions',
        'Preview the next subscription invoice',
        'upcoming_invoice',
        pathParameter('subscriptionId')
      ),
    },
    '/subscriptions/{subscriptionId}/preview-proration': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Preview a mid-period subscription item change',
        security: [{ Session: [] }],
        parameters: [pathParameter('subscriptionId')],
        requestBody: jsonBody('SubscriptionProrationPreviewParams'),
        responses: resourceResponse('proration_preview'),
      },
    },
    '/payment-terms': {
      get: listPath('Invoices', 'List payment terms', 'payment_term'),
      post: createPath(
        'Invoices',
        'Create a payment term',
        'PaymentTermCreateParams',
        'payment_term'
      ),
    },
    '/salespeople': {
      get: listPath('Invoices', 'List salespeople', 'salesperson'),
      post: createPath(
        'Invoices',
        'Create a salesperson',
        'SalespersonCreateParams',
        'salesperson'
      ),
    },
    '/products': {
      get: listPath('Catalog', 'List products', 'product'),
      post: createPath(
        'Catalog',
        'Create a product',
        'ProductCreateParams',
        'product'
      ),
    },
    '/products/{productId}': {
      get: retrievePath(
        'Catalog',
        'Retrieve a product',
        'product',
        pathParameter('productId')
      ),
      patch: updatePath(
        'Catalog',
        'Update a product',
        'ProductUpdateParams',
        'product',
        pathParameter('productId')
      ),
      delete: deletePath(
        'Catalog',
        'Delete an unused product',
        'product',
        pathParameter('productId')
      ),
    },
    '/plans': {
      get: listPath('Catalog', 'List plans', 'plan'),
      post: createPath('Catalog', 'Create a plan', 'PlanCreateParams', 'plan'),
    },
    '/plans/{planId}': {
      get: retrievePath(
        'Catalog',
        'Retrieve a plan',
        'plan',
        pathParameter('planId')
      ),
      patch: updatePath(
        'Catalog',
        'Update a plan',
        'PlanUpdateParams',
        'plan',
        pathParameter('planId')
      ),
      delete: deletePath(
        'Catalog',
        'Delete an unused plan',
        'plan',
        pathParameter('planId')
      ),
    },
    '/plans/{planId}/clone': {
      post: actionWithBodyPath(
        'Catalog',
        'Clone a plan with fresh prices and tiers',
        'PlanCloneParams',
        'plan',
        pathParameter('planId')
      ),
    },
    '/prices': {
      get: listPath('Catalog', 'List prices', 'price'),
      post: createPath(
        'Catalog',
        'Create an immutable catalog price',
        'PriceCreateParams',
        'price'
      ),
    },
    '/prices/{priceId}': {
      get: retrievePath(
        'Catalog',
        'Retrieve a price',
        'price',
        pathParameter('priceId')
      ),
      patch: updatePath(
        'Catalog',
        'Update price metadata or lifecycle state',
        'PriceUpdateParams',
        'price',
        pathParameter('priceId')
      ),
      delete: deletePath(
        'Catalog',
        'Delete an unused price',
        'price',
        pathParameter('priceId')
      ),
    },
    '/addons': {
      get: listPath('Catalog', 'List add-ons', 'addon'),
      post: createPath(
        'Catalog',
        'Create an add-on',
        'AddonCreateParams',
        'addon'
      ),
    },
    '/addons/{addonId}': {
      get: retrievePath(
        'Catalog',
        'Retrieve an add-on',
        'addon',
        pathParameter('addonId')
      ),
      patch: updatePath(
        'Catalog',
        'Update an add-on',
        'AddonUpdateParams',
        'addon',
        pathParameter('addonId')
      ),
      delete: deletePath(
        'Catalog',
        'Delete an unused add-on',
        'addon',
        pathParameter('addonId')
      ),
    },
    '/addons/{addonId}/clone': {
      post: actionWithBodyPath(
        'Catalog',
        'Clone an add-on with fresh prices and plan availability',
        'AddonCloneParams',
        'addon',
        pathParameter('addonId')
      ),
    },
    '/addons/{addonId}/associations': {
      put: actionWithBodyPath(
        'Catalog',
        'Create or update add-on availability for a plan',
        'AddonAssociationMutationParams',
        'plan_addon_association',
        pathParameter('addonId')
      ),
    },
    '/price-lists': {
      get: listPath('Catalog', 'List price lists', 'price_list'),
      post: createPath(
        'Catalog',
        'Create a percentage or custom price list',
        'PriceListCreateParams',
        'price_list'
      ),
    },
    '/price-lists/{priceListId}': {
      get: retrievePath(
        'Catalog',
        'Retrieve a price list',
        'price_list',
        pathParameter('priceListId')
      ),
      patch: updatePath(
        'Catalog',
        'Update a price list',
        'PriceListUpdateParams',
        'price_list',
        pathParameter('priceListId')
      ),
      delete: deletePath(
        'Catalog',
        'Delete an unused price list',
        'price_list',
        pathParameter('priceListId')
      ),
    },
    '/price-lists/{priceListId}/resolve': {
      post: actionWithBodyPath(
        'Catalog',
        'Resolve a catalog price through a price list',
        'PriceListResolveParams',
        'resolved_price',
        pathParameter('priceListId')
      ),
    },
    '/discounts/coupons': {
      get: listPath('Discounts', 'List coupons', 'coupon'),
      post: createPath(
        'Discounts',
        'Create a coupon',
        'CouponCreateParams',
        'coupon'
      ),
    },
    '/discounts/coupons/{couponId}': {
      get: retrievePath(
        'Discounts',
        'Retrieve a coupon and its applicability',
        'coupon',
        pathParameter('couponId')
      ),
      patch: updatePath(
        'Discounts',
        'Update coupon lifecycle fields',
        'CouponUpdateParams',
        'coupon',
        pathParameter('couponId')
      ),
      delete: deletePath(
        'Discounts',
        'Delete an unused coupon',
        'coupon',
        pathParameter('couponId')
      ),
    },
    '/discounts/promotion-codes': {
      get: listPath('Discounts', 'List promotion codes', 'promotion_code'),
      post: createPath(
        'Discounts',
        'Create a promotion code',
        'PromotionCodeCreateParams',
        'promotion_code'
      ),
    },
    '/payment-providers': {
      get: listPath(
        'Payment providers',
        'List available payment providers',
        'payment_provider'
      ),
    },
    '/payment-providers/connections': {
      get: listPath(
        'Payment providers',
        'List tenant provider connections',
        'payment_provider_connection'
      ),
      post: createPath(
        'Payment providers',
        'Create a provider connection',
        'PaymentProviderConnectionCreateParams',
        'payment_provider_connection'
      ),
    },
    '/payment-providers/connections/{connectionId}': {
      patch: updatePath(
        'Payment providers',
        'Update a provider connection',
        'PaymentProviderConnectionUpdateParams',
        'payment_provider_connection',
        pathParameter('connectionId')
      ),
    },
    '/tax-authorities': {
      get: listPath('Taxes', 'List tax authorities', 'tax_authority'),
      post: createPath(
        'Taxes',
        'Create a tax authority',
        'TaxAuthorityCreateParams',
        'tax_authority'
      ),
    },
    '/tax-authorities/{taxAuthorityId}': {
      patch: updatePath(
        'Taxes',
        'Update a tax authority',
        'TaxAuthorityUpdateParams',
        'tax_authority',
        pathParameter('taxAuthorityId')
      ),
    },
    '/tax-rates': {
      get: listPath('Taxes', 'List tax rates', 'tax_rate'),
      post: createPath(
        'Taxes',
        'Create an immutable tax rate',
        'TaxRateCreateParams',
        'tax_rate'
      ),
    },
    '/tax-rates/{taxRateId}': {
      patch: updatePath(
        'Taxes',
        'Update a tax rate',
        'TaxRateUpdateParams',
        'tax_rate',
        pathParameter('taxRateId')
      ),
    },
    '/roles': {
      get: listPath('Access', 'List Billing roles', 'billing_role'),
      post: createPath(
        'Access',
        'Create a custom Billing role',
        'RoleCreateParams',
        'billing_role'
      ),
    },
    '/roles/{roleId}': {
      get: retrievePath(
        'Access',
        'Retrieve a Billing role',
        'billing_role',
        pathParameter('roleId')
      ),
      patch: updatePath(
        'Access',
        'Update a custom Billing role',
        'RoleUpdateParams',
        'billing_role',
        pathParameter('roleId')
      ),
      delete: deletePath(
        'Access',
        'Delete a custom Billing role',
        'billing_role',
        pathParameter('roleId')
      ),
    },
    '/members/{userId}': {
      patch: updatePath(
        'Access',
        'Update a member Billing grant',
        'MemberUpdateParams',
        'billing_member',
        pathParameter('userId')
      ),
    },
    '/admin/products/ensure': ensurePath('product', 'ProductEnsureParams'),
    '/admin/plans/ensure': ensurePath('plan', 'PlanEnsureParams'),
    '/admin/prices/ensure': ensurePath('price', 'PriceEnsureParams'),
    '/admin/customers/ensure': ensurePath('customer', 'CustomerEnsureParams'),
    '/admin/subscriptions/ensure': ensurePath(
      'subscription',
      'SubscriptionEnsureParams'
    ),
    '/admin/billing/run': {
      post: {
        tags: ['Admin sync'],
        summary: 'Run a bounded provider-independent billing sweep',
        security: [{ internalKey: [] }],
        requestBody: jsonBody('BillingSweepParams'),
        responses: resourceResponse('billing_engine_run'),
      },
    },
    '/integrations/organizations/{organizationId}': {
      get: integrationRetrievePath(
        'Retrieve an organization Billing workspace',
        'billing_organization',
        'billing.organizations.read',
        [pathParameter('organizationId')]
      ),
    },
    '/integrations/organizations/{organizationId}/customers': {
      get: integrationListPath(
        'List organization Billing customers',
        'customer',
        'billing.customers.read',
        [
          pathParameter('organizationId'),
          queryParameter('limit', {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          }),
          queryParameter('starting_after', { type: 'string' }),
          queryParameter('ending_before', { type: 'string' }),
          queryParameter('user_id', { type: 'string' }),
          queryParameter('organization_id', { type: 'string' }),
        ]
      ),
      post: integrationCreatePath(
        'Create an organization Billing customer',
        'IntegrationCustomerCreateParams',
        'customer',
        'billing.customers.write',
        [pathParameter('organizationId')]
      ),
    },
    '/integrations/organizations/{organizationId}/customers/{customerId}': {
      get: integrationRetrievePath(
        'Retrieve an organization Billing customer',
        'customer',
        'billing.customers.read',
        [pathParameter('organizationId'), pathParameter('customerId')]
      ),
      patch: integrationUpdatePath(
        'Update an organization Billing customer',
        'CustomerUpdateParams',
        'customer',
        'billing.customers.write',
        [pathParameter('organizationId'), pathParameter('customerId')]
      ),
      delete: integrationDeletePath(
        'Archive an organization Billing customer',
        'customer',
        'billing.customers.write',
        [pathParameter('organizationId'), pathParameter('customerId')]
      ),
    },
    '/integrations/organizations/{organizationId}/items': {
      get: integrationListPath(
        'List shared finance catalog items',
        'item',
        'billing.items.read',
        [
          pathParameter('organizationId'),
          queryParameter('active', { type: 'string' }),
        ]
      ),
      post: integrationCreatePath(
        'Create a shared finance catalog item',
        'IntegrationItemCreateParams',
        'item',
        'billing.items.write',
        [pathParameter('organizationId')]
      ),
    },
    '/integrations/organizations/{organizationId}/items/{itemId}': {
      get: integrationRetrievePath(
        'Retrieve a shared finance catalog item',
        'item',
        'billing.items.read',
        [pathParameter('organizationId'), pathParameter('itemId')]
      ),
      patch: integrationUpdatePath(
        'Update a shared finance catalog item',
        'ItemUpdateParams',
        'item',
        'billing.items.write',
        [pathParameter('organizationId'), pathParameter('itemId')]
      ),
      delete: integrationDeletePath(
        'Archive a shared finance catalog item',
        'item',
        'billing.items.write',
        [pathParameter('organizationId'), pathParameter('itemId')]
      ),
    },
    '/integrations/organizations/{organizationId}/invoices': {
      get: integrationListPath(
        'List shared finance invoices',
        'invoice',
        'billing.invoices.read',
        [
          pathParameter('organizationId'),
          queryParameter('status', { type: 'string' }),
        ]
      ),
      post: integrationCreatePath(
        'Create a shared finance invoice',
        'IntegrationInvoiceCreateParams',
        'invoice',
        'billing.invoices.write',
        [pathParameter('organizationId')]
      ),
    },
    '/integrations/organizations/{organizationId}/invoices/{invoiceId}': {
      get: integrationRetrievePath(
        'Retrieve a shared finance invoice',
        'invoice',
        'billing.invoices.read',
        [pathParameter('organizationId'), pathParameter('invoiceId')]
      ),
      patch: integrationUpdatePath(
        'Update a shared finance invoice',
        'InvoiceUpdateParams',
        'invoice',
        'billing.invoices.write',
        [pathParameter('organizationId'), pathParameter('invoiceId')]
      ),
    },
    '/integrations/organizations/{organizationId}/invoices/{invoiceId}/finalize':
      {
        post: integrationActionWithBodyPath(
          'Finalize a shared finance invoice',
          'InvoiceFinalizeParams',
          'invoice',
          'billing.invoices.write',
          [pathParameter('organizationId'), pathParameter('invoiceId')]
        ),
      },
    '/integrations/organizations/{organizationId}/invoices/{invoiceId}/void': {
      post: integrationActionWithBodyPath(
        'Void a shared finance invoice',
        'InvoiceVoidParams',
        'invoice',
        'billing.invoices.write',
        [pathParameter('organizationId'), pathParameter('invoiceId')]
      ),
    },
    '/integrations/organizations/{organizationId}/payments': {
      get: integrationListPath(
        'List shared finance payments',
        'payment',
        'billing.payments.read',
        [pathParameter('organizationId')]
      ),
      post: integrationCreatePath(
        'Record a shared finance payment',
        'IntegrationPaymentCreateParams',
        'payment',
        'billing.payments.write',
        [pathParameter('organizationId')]
      ),
    },
    '/integrations/organizations/{organizationId}/payment-modes': {
      get: integrationListPath(
        'List shared payment methods',
        'payment_mode',
        'billing.payments.read',
        [pathParameter('organizationId')]
      ),
    },
    '/integrations/organizations/{organizationId}/bank-accounts': {
      get: integrationListPath(
        'List shared deposit accounts',
        'bank_account',
        'billing.payments.read',
        [pathParameter('organizationId')]
      ),
    },
    '/integrations/organizations/{organizationId}/payments/{paymentId}': {
      get: integrationRetrievePath(
        'Retrieve a shared finance payment',
        'payment',
        'billing.payments.read',
        [pathParameter('organizationId'), pathParameter('paymentId')]
      ),
    },
  },
  components: {
    securitySchemes: {
      Session: {
        type: 'apiKey',
        in: 'cookie',
        name: '876-session',
        description: 'Sealed 876 session for an active Billing workspace.',
      },
      internalKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-internal-key',
        description: 'Server-only Billing platform-admin credential.',
      },
      appApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-876-api-key',
        description:
          'A server-only 876 product app key with an active finance connection.',
      },
      delegatedOAuth: {
        type: 'oauth2',
        description:
          'A short-lived 876 access token. The subject must also be an active member of the target organization.',
        flows: {
          authorizationCode: {
            authorizationUrl: `${oauthIssuer}/oauth/authorize`,
            tokenUrl: `${oauthIssuer}/oauth/token`,
            scopes: {
              'billing.organizations.read':
                'Read Billing workspace details for an organization.',
              'billing.customers.read':
                'Read Billing customers for an organization.',
              'billing.customers.write':
                'Create, update, and archive Billing customers for an organization.',
              'billing.items.read':
                'Read shared finance catalog items for an organization.',
              'billing.items.write':
                'Create, update, and archive shared finance catalog items for an organization.',
              'billing.plans.read': 'Read Billing plans for an organization.',
              'billing.subscriptions.read':
                'Read Billing subscriptions for an organization.',
              'billing.subscriptions.write':
                'Manage Billing subscriptions for an organization.',
              'billing.invoices.read':
                'Read shared finance invoices for an organization.',
              'billing.invoices.write':
                'Create and manage shared finance invoices for an organization.',
              'billing.payments.read':
                'Read shared finance payments for an organization.',
              'billing.payments.write':
                'Record shared finance payments for an organization.',
            },
          },
        },
      },
    },
    schemas: {
      AppError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          param: { type: 'string' },
        },
        additionalProperties: false,
      },
      ...requestSchemas,
      ...integrationRequestSchemas,
    },
  },
} as const

function jsonBody(schema: string) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schema}` },
      },
    },
  }
}

function createdResponse(object: string) {
  return {
    '201': {
      description: `${object} created`,
      content: {
        'application/json': {
          schema: resultEnvelopeSchema(object, 'acknowledgement'),
        },
      },
    },
    '4XX': errorResponse(),
  }
}

function ensurePath(object: string, schema: string) {
  return {
    post: {
      tags: ['Admin sync'],
      summary: `Idempotently ensure a ${object}`,
      security: [{ internalKey: [] }],
      requestBody: jsonBody(schema),
      responses: {
        '200': {
          description: `${object} ensured`,
          content: {
            'application/json': {
              schema: resultEnvelopeSchema(object, 'acknowledgement'),
            },
          },
        },
        '4XX': errorResponse(),
      },
    },
  }
}

function integrationSecurity(scope: string) {
  return [{ internalKey: [] }, { appApiKey: [] }, { delegatedOAuth: [scope] }]
}

function integrationListPath(
  summary: string,
  object: string,
  scope: string,
  parameters: ApiParameter[]
) {
  return {
    tags: ['Organization integrations'],
    summary,
    security: integrationSecurity(scope),
    parameters,
    responses: {
      '200': {
        description: `${object} list`,
        content: {
          'application/json': { schema: listEnvelopeSchema(object) },
        },
      },
      '4XX': errorResponse(),
    },
  }
}

function integrationRetrievePath(
  summary: string,
  object: string,
  scope: string,
  parameters: ReturnType<typeof pathParameter>[]
) {
  return {
    tags: ['Organization integrations'],
    summary,
    security: integrationSecurity(scope),
    parameters,
    responses: resourceResponse(object),
  }
}

function integrationCreatePath(
  summary: string,
  schema: string,
  object: string,
  scope: string,
  parameters: ApiParameter[]
) {
  return {
    tags: ['Organization integrations'],
    summary,
    security: integrationSecurity(scope),
    parameters: [...parameters, idempotencyKeyParameter()],
    requestBody: jsonBody(schema),
    responses: {
      '200': resourceResponse(object)['200'],
      '201': createdResponse(object)['201'],
      '4XX': errorResponse(),
    },
  }
}

function integrationUpdatePath(
  summary: string,
  schema: string,
  object: string,
  scope: string,
  parameters: ReturnType<typeof pathParameter>[]
) {
  return {
    tags: ['Organization integrations'],
    summary,
    security: integrationSecurity(scope),
    parameters,
    requestBody: jsonBody(schema),
    responses: resourceResponse(object),
  }
}

function integrationActionWithBodyPath(
  summary: string,
  schema: string,
  object: string,
  scope: string,
  parameters: ReturnType<typeof pathParameter>[]
) {
  return {
    tags: ['Organization integrations'],
    summary,
    security: integrationSecurity(scope),
    parameters,
    requestBody: jsonBody(schema),
    responses: resourceResponse(object),
  }
}

function integrationDeletePath(
  summary: string,
  object: string,
  scope: string,
  parameters: ReturnType<typeof pathParameter>[]
) {
  return {
    tags: ['Organization integrations'],
    summary,
    security: integrationSecurity(scope),
    parameters,
    responses: deletedResponse(object),
  }
}

function listPath(tag: string, summary: string, object: string) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    responses: {
      '200': {
        description: `${object} list`,
        content: {
          'application/json': { schema: listEnvelopeSchema(object) },
        },
      },
      '4XX': errorResponse(),
    },
  }
}

function createPath(
  tag: string,
  summary: string,
  schema: string,
  object: string
) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    requestBody: jsonBody(schema),
    responses: createdResponse(object),
  }
}

function updatePath(
  tag: string,
  summary: string,
  schema: string,
  object: string,
  parameter?: ReturnType<typeof pathParameter>
) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    ...(parameter ? { parameters: [parameter] } : {}),
    requestBody: jsonBody(schema),
    responses: acknowledgementResponse(object),
  }
}

function retrievePath(
  tag: string,
  summary: string,
  object: string,
  parameter: ReturnType<typeof pathParameter>
) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    parameters: [parameter],
    responses: resourceResponse(object),
  }
}

function retrievePathWithoutParameter(
  tag: string,
  summary: string,
  object: string
) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    responses: resourceResponse(object),
  }
}

function actionPath(tag: string, summary: string, object: string) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    responses: resourceResponse(object),
  }
}

function actionWithBodyPath(
  tag: string,
  summary: string,
  schema: string,
  object: string,
  parameter: ReturnType<typeof pathParameter>
) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    parameters: [parameter],
    requestBody: jsonBody(schema),
    responses: resourceResponse(object),
  }
}

function deletePath(
  tag: string,
  summary: string,
  object: string,
  ...parameters: Array<ReturnType<typeof pathParameter>>
) {
  return {
    tags: [tag],
    summary,
    security: [{ Session: [] }],
    parameters,
    responses: deletedResponse(object),
  }
}

function pathParameter(name: string) {
  return {
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  } as const
}

function queryParameter(
  name: string,
  schema: {
    type: 'integer' | 'string'
    minimum?: number
    maximum?: number
  }
) {
  return {
    name,
    in: 'query',
    required: false,
    schema,
  } as const
}

function idempotencyKeyParameter() {
  return {
    name: 'Idempotency-Key',
    in: 'header',
    required: false,
    description:
      'Required for product app and delegated OAuth creates; stable across retries.',
    schema: { type: 'string', minLength: 1, maxLength: 255 },
  } as const
}

type ApiParameter =
  | ReturnType<typeof pathParameter>
  | ReturnType<typeof queryParameter>
  | ReturnType<typeof idempotencyKeyParameter>

function acknowledgementResponse(object: string) {
  return {
    '200': {
      description: `${object} returned`,
      content: {
        'application/json': {
          schema: resultEnvelopeSchema(object, 'acknowledgement'),
        },
      },
    },
    '4XX': errorResponse(),
  }
}

function resourceResponse(object: string) {
  return {
    '200': {
      description: `${object} returned`,
      content: {
        'application/json': {
          schema: resultEnvelopeSchema(object, 'resource'),
        },
      },
    },
    '4XX': errorResponse(),
  }
}

function deletedResponse(object: string) {
  return {
    '200': {
      description: `${object} deleted`,
      content: {
        'application/json': {
          schema: resultEnvelopeSchema(object, 'deleted'),
        },
      },
    },
    '4XX': errorResponse(),
  }
}

function listEnvelopeSchema(object: string) {
  return {
    type: 'object',
    required: ['data', 'error'],
    properties: {
      data: {
        type: 'object',
        required: ['object', 'data', 'has_more', 'total_count', 'url'],
        properties: {
          object: { const: 'list' },
          data: {
            type: 'array',
            items: resourceSchema(object, 'resource'),
          },
          has_more: { type: 'boolean' },
          total_count: { type: ['integer', 'null'] },
          url: { type: 'string' },
        },
      },
      error: { type: 'null' },
    },
    additionalProperties: false,
  }
}

function resultEnvelopeSchema(
  object: string,
  kind: 'acknowledgement' | 'deleted' | 'resource'
) {
  return {
    type: 'object',
    required: ['data', 'error'],
    properties: {
      data: resourceSchema(object, kind),
      error: { type: 'null' },
    },
    additionalProperties: false,
  }
}

function resourceSchema(
  object: string,
  kind: 'acknowledgement' | 'deleted' | 'resource'
) {
  return {
    type: 'object',
    required:
      kind === 'deleted' ? ['object', 'id', 'deleted'] : ['object', 'id'],
    properties: {
      object: { const: object },
      id: { type: 'string' },
      ...(kind === 'deleted' ? { deleted: { const: true } } : {}),
    },
    additionalProperties: kind === 'resource',
  }
}

function errorResponse() {
  return {
    description: 'Client-safe error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['data', 'error'],
          properties: {
            data: { type: 'null' },
            error: { $ref: '#/components/schemas/AppError' },
          },
          additionalProperties: false,
        },
      },
    },
  }
}

function toOpenApiSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  })
}

function withIntegrationSourceReference(
  schema: ReturnType<typeof toOpenApiSchema>
) {
  if (
    typeof schema !== 'object' ||
    schema === null ||
    !('properties' in schema)
  )
    throw new TypeError('Integration create schema must be an object schema.')

  return {
    ...schema,
    properties: {
      ...(schema.properties as Record<string, unknown>),
      sourceExternalReference: {
        anyOf: [
          { type: 'string', minLength: 1, maxLength: 255 },
          { type: 'null' },
        ],
      },
    },
  }
}
