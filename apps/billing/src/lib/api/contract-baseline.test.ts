import { describe, expect, it } from 'vitest'

import openApi from '../../../contracts/v1/openapi.json'
import routeManifest from '../../../contracts/v1/route-manifest.json'

function route(path: string) {
  const entry = routeManifest.routes.find(
    (candidate) => candidate.path === path
  )
  if (!entry) throw new Error(`Missing contract route: ${path}`)

  return entry
}

describe('Billing API v1 contract baseline', () => {
  it('captures every legacy versioned operation', () => {
    const operationCount = routeManifest.routes.reduce(
      (count, entry) => count + entry.operations.length,
      0
    )

    // 109 legacy Next.js routes / 187 operations, plus the payment-method and
    // payment-intent surface, plus the accounting-provider surface — both of
    // which only ever existed in @876/billing-api — plus the two quote
    // integration routes (3 operations) added so 876 Invoice can reach the
    // quote capability the documents service already owns.
    expect(routeManifest.routes).toHaveLength(130)
    expect(operationCount).toBe(216)
  })

  it('records authorization per operation instead of per route file', () => {
    expect(route('/products').operations).toEqual([
      expect.objectContaining({
        auth_tier: 'tenant',
        declared_permissions: ['catalog:read'],
        method: 'GET',
      }),
      expect.objectContaining({
        auth_tier: 'tenant',
        declared_permissions: ['catalog:write'],
        method: 'POST',
      }),
    ])

    expect(
      route('/integrations/organizations/{organizationId}/customers').operations
    ).toEqual([
      expect.objectContaining({
        auth_tier: 'integration',
        declared_scopes: ['billing.customers.read'],
        method: 'GET',
      }),
      expect.objectContaining({
        auth_tier: 'integration',
        declared_scopes: ['billing.customers.write'],
        method: 'POST',
      }),
    ])
  })

  // `route-manifest.json` is the frozen *legacy* inventory (the Next.js and
  // FastAPI surface). Capabilities added after that freeze are legitimately
  // documented without appearing in it, so each one is listed here explicitly
  // rather than the check being dropped — an undocumented path still fails.
  const POST_LEGACY_PATHS = [
    '/banking/directory/banks',
    '/banking/directory/banks/{bankId}/branches',
    // Cross-bank branch lookup by ids, added so the banking list resolves a
    // page of accounts with one directory call instead of one per row.
    '/banking/directory/branches',
    '/banking/accounts/{accountId}/account-number',
    '/banking/accounts/{accountId}/statement-imports',
    '/banking/statement-imports/{importId}',
    '/banking/statement-imports/{importId}/undo',
    '/banking/accounts/{accountId}/statement-lines',
    '/banking/statement-lines/{lineId}',
    '/banking/statement-lines/{lineId}/matches',
    '/banking/statement-lines/{lineId}/unmatch',
    '/banking/statement-lines/{lineId}/categorize',
    '/banking/statement-lines/{lineId}/exclude',
    '/banking/statement-lines/{lineId}/restore',
    '/banking/transfers',
    '/banking/accounts/{accountId}/reconciliations',
    '/banking/reconciliations/{reconciliationId}',
    '/banking/reconciliations/{reconciliationId}/complete',
    '/banking/reconciliations/{reconciliationId}/reopen',
    '/banking/rules',
    '/banking/rules/{ruleId}',
    '/banking/accounts/{accountId}/statement-imports/preview',
    '/banking/accounts/{accountId}/statement-imports/file',
    '/banking/deposits',
    '/banking/deposits/{depositId}',
    '/banking/deposits/{depositId}/void',

    // Customer contacts: Express-only, and already documented on `main`.
    '/customers/{customerId}/contacts',
    '/customers/{customerId}/contacts/{contactId}',
    // Quote lifecycle transitions, added with the Estimate/Quote merge.
    '/quotes/{quoteId}/send',
    '/quotes/{quoteId}/accept',
    '/quotes/{quoteId}/decline',
    '/quotes/{quoteId}/cancel',
    '/quotes/{quoteId}/expire',
    '/quotes/{quoteId}/convert-to-invoice',
    '/quote-preferences',
    '/integrations/organizations/{organizationId}/quotes/{quoteId}/send',
    '/integrations/organizations/{organizationId}/quotes/{quoteId}/accept',
    '/integrations/organizations/{organizationId}/quotes/{quoteId}/decline',
    '/integrations/organizations/{organizationId}/quotes/{quoteId}/cancel',
    '/integrations/organizations/{organizationId}/quotes/{quoteId}/expire',
    '/integrations/organizations/{organizationId}/quotes/{quoteId}/convert-to-invoice',
    '/integrations/organizations/{organizationId}/quote-preferences',
    // Item stock adjustments, added with lightweight stock tracking. Stock is
    // an Express-only capability, so neither path exists in the legacy
    // inventory.
    '/items/{itemId}/stock-adjustments',
    '/integrations/organizations/{organizationId}/items/{itemId}/stock-adjustments',
    // Item variants and Storage-backed Item media, added with optional product
    // variants. Both are Express-only capabilities, and each is exposed at the
    // tenant tier and again at the integration tier so 876 Invoice reaches the
    // same Item records rather than growing a catalogue of its own.
    '/item-preferences',
    '/item-variants',
    '/items/{itemId}/variants',
    '/items/{itemId}/variants/generate',
    '/items/{itemId}/variants/{variantId}',
    '/items/{itemId}/variants/{variantId}/stock-adjustments',
    '/items/{itemId}/media',
    '/items/{itemId}/media/{fileId}',
    '/items/{itemId}/variants/{variantId}/media',
    '/items/{itemId}/variants/{variantId}/media/{fileId}',
    '/integrations/organizations/{organizationId}/item-preferences',
    '/integrations/organizations/{organizationId}/item-variants',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/generate',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}/stock-adjustments',
    '/integrations/organizations/{organizationId}/items/{itemId}/media',
    '/integrations/organizations/{organizationId}/items/{itemId}/media/{fileId}',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}/media',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}/media/{fileId}',

    // Organization-scoped payment mode and tax administration. Express-only,
    // added so 876 Invoice configures the same Billing-owned payment modes,
    // tax authorities, and tax rates rather than keeping its own copies.
    '/integrations/organizations/{organizationId}/payment-modes/{modeId}',
    '/integrations/organizations/{organizationId}/tax-authorities',
    '/integrations/organizations/{organizationId}/tax-authorities/{taxAuthorityId}',
    '/integrations/organizations/{organizationId}/tax-rates',
    '/integrations/organizations/{organizationId}/tax-rates/{taxRateId}',

    // Invoice communication and write-off commands are Express-only lifecycle
    // capabilities, exposed at both tenant and integration tiers.
    '/invoices/{invoiceId}/send',
    '/invoices/{invoiceId}/write-off',
    '/integrations/organizations/{organizationId}/invoices/{invoiceId}/send',
    '/integrations/organizations/{organizationId}/invoices/{invoiceId}/write-off',

    // Payment corrections and refunds exposed to first-party finance apps.
    '/integrations/organizations/{organizationId}/payments/{paymentId}/apply',
    '/integrations/organizations/{organizationId}/refunds',

    // Sales receipts and quote-to-sales-receipt conversion are Express-only
    // commercial workflows, exposed at tenant and integration tiers.
    '/sales-receipts',
    '/sales-receipts/{salesReceiptId}',
    '/sales-receipts/{salesReceiptId}/refund',
    '/sales-receipts/{salesReceiptId}/void',
    '/quotes/{quoteId}/convert-to-sales-receipt',
    '/integrations/organizations/{organizationId}/sales-receipts',
    '/integrations/organizations/{organizationId}/sales-receipts/{salesReceiptId}',
    '/integrations/organizations/{organizationId}/sales-receipts/{salesReceiptId}/refund',
    '/integrations/organizations/{organizationId}/sales-receipts/{salesReceiptId}/void',
    '/integrations/organizations/{organizationId}/quotes/{quoteId}/convert-to-sales-receipt',

    // Recurring invoice profiles and derived reporting are Express-only
    // commercial capabilities, each mirrored to Invoice at integration scope.
    '/recurring-invoices',
    '/recurring-invoices/{recurringInvoiceId}',
    '/recurring-invoices/{recurringInvoiceId}/pause',
    '/recurring-invoices/{recurringInvoiceId}/resume',
    '/recurring-invoices/{recurringInvoiceId}/stop',
    '/recurring-invoices/{recurringInvoiceId}/invoices',
    '/integrations/organizations/{organizationId}/recurring-invoices',
    '/integrations/organizations/{organizationId}/recurring-invoices/{recurringInvoiceId}',
    '/integrations/organizations/{organizationId}/recurring-invoices/{recurringInvoiceId}/pause',
    '/integrations/organizations/{organizationId}/recurring-invoices/{recurringInvoiceId}/resume',
    '/integrations/organizations/{organizationId}/recurring-invoices/{recurringInvoiceId}/stop',
    '/integrations/organizations/{organizationId}/recurring-invoices/{recurringInvoiceId}/invoices',
    '/reports/sales-summary',
    '/reports/cash-summary',
    '/reports/receivables-aging',
    '/reports/item-sales',
    '/reports/customer-sales',
    '/reports/subscription-summary',
    '/items/{itemId}/sales-summary',
    '/report-preferences',
    '/integrations/organizations/{organizationId}/reports/sales-summary',
    '/integrations/organizations/{organizationId}/reports/cash-summary',
    '/integrations/organizations/{organizationId}/reports/receivables-aging',
    '/integrations/organizations/{organizationId}/reports/item-sales',
    '/integrations/organizations/{organizationId}/reports/customer-sales',
    '/integrations/organizations/{organizationId}/reports/subscription-summary',
    '/integrations/organizations/{organizationId}/items/{itemId}/sales-summary',
    '/integrations/organizations/{organizationId}/report-preferences',
    // Invoice clone and make-recurring. Both are Express-only document
    // commands that reuse the create path server-side, so a duplicate or a
    // recurring profile keeps the source invoice's line taxes and discounts
    // instead of being reassembled by the caller.
    '/invoices/{invoiceId}/clone',
    '/invoices/{invoiceId}/make-recurring',
    '/integrations/organizations/{organizationId}/invoices/{invoiceId}/clone',
    '/integrations/organizations/{organizationId}/invoices/{invoiceId}/make-recurring',
  ]

  it('does not document paths absent from the implementation inventory', () => {
    const implementedPaths = new Set([
      ...routeManifest.routes.map((entry) => entry.path),
      ...POST_LEGACY_PATHS,
    ])

    expect(
      Object.keys(openApi.paths).filter((path) => !implementedPaths.has(path))
    ).toEqual([])
  })

  it('keeps every allowed post-legacy path actually documented', () => {
    const documented = new Set(Object.keys(openApi.paths))

    expect(POST_LEGACY_PATHS.filter((path) => !documented.has(path))).toEqual(
      []
    )
  })
})
