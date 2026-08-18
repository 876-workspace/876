import { describe, expect, it } from 'vitest'

import { getInvoiceBillingConfig } from './billing-config'

function env(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    BILLING_API_URL: 'https://876-billing-api.example.test',
    INVOICE_API_876_KEY: '876_app_secret_invoice',
    ...overrides,
  }
}

describe('Invoice Billing configuration', () => {
  it('returns one normalized config for tenant and integration clients', () => {
    expect(getInvoiceBillingConfig(env())).toEqual({
      baseUrl: 'https://876-billing-api.example.test',
      apiKey: '876_app_secret_invoice',
    })
  })

  it('trims the app key and URL', () => {
    expect(
      getInvoiceBillingConfig(
        env({
          BILLING_API_URL: '  https://876-billing-api.example.test  ',
          INVOICE_API_876_KEY: '  invoice-key  ',
        })
      )
    ).toEqual({
      baseUrl: 'https://876-billing-api.example.test',
      apiKey: 'invoice-key',
    })
  })

  it.each([undefined, '', '   '])(
    'fails when BILLING_API_URL is %s instead of falling back to localhost',
    (value) => {
      expect(() =>
        getInvoiceBillingConfig(env({ BILLING_API_URL: value }))
      ).toThrow('BILLING_API_URL is required')
    }
  )

  it.each([undefined, '', '   '])(
    'fails when INVOICE_API_876_KEY is %s instead of creating an unauthenticated client',
    (value) => {
      expect(() =>
        getInvoiceBillingConfig(env({ INVOICE_API_876_KEY: value }))
      ).toThrow('INVOICE_API_876_KEY is required')
    }
  )

  it.each(['not-a-url', 'billing-api', '://bad'])('rejects malformed URL %s', (url) => {
    expect(() =>
      getInvoiceBillingConfig(env({ BILLING_API_URL: url }))
    ).toThrow('must be a valid URL')
  })

  it.each(['ftp://billing.example.test', 'file:///tmp/billing'])('rejects unsupported scheme %s', (url) => {
    expect(() =>
      getInvoiceBillingConfig(env({ BILLING_API_URL: url }))
    ).toThrow('must use http:// or https://')
  })

  it('rejects embedded credentials', () => {
    expect(() =>
      getInvoiceBillingConfig(
        env({ BILLING_API_URL: 'https://user:pass@billing.example.test' })
      )
    ).toThrow('must not contain embedded credentials')
  })

  it.each([
    'https://billing.example.test/api/v1',
    'https://billing.example.test/?region=jm',
    'https://billing.example.test/#finance',
  ])('rejects a non-origin Billing target %s', (url) => {
    expect(() =>
      getInvoiceBillingConfig(env({ BILLING_API_URL: url }))
    ).toThrow('must be a service origin')
  })

  it('permits explicit localhost configuration for local development', () => {
    expect(
      getInvoiceBillingConfig(
        env({ BILLING_API_URL: 'http://127.0.0.1:4004' })
      ).baseUrl
    ).toBe('http://127.0.0.1:4004')
  })
})
