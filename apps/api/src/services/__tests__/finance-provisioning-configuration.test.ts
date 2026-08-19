import { describe, expect, it } from 'vitest'

import { assertFinanceProvisioningConfiguration } from '../finance-provisioning-configuration'

function settings(
  overrides: Partial<{
    url: string
    internalKey: string
    financeProvisioningDisabled: boolean
  }> = {}
) {
  return {
    billing: {
      url: 'https://876-billing-api.example.test',
      internalKey: 'shared-secret',
      financeProvisioningDisabled: false,
      ...overrides,
    },
  }
}

describe('finance provisioning configuration', () => {
  it('accepts an enabled, fully configured Billing peer', () => {
    expect(() =>
      assertFinanceProvisioningConfiguration(settings())
    ).not.toThrow()
  })

  it('allows Billing configuration to be absent when provisioning is explicitly disabled', () => {
    expect(() =>
      assertFinanceProvisioningConfiguration(
        settings({
          url: '',
          internalKey: '',
          financeProvisioningDisabled: true,
        })
      )
    ).not.toThrow()
  })

  it('fails fast when the Billing URL is missing', () => {
    expect(() =>
      assertFinanceProvisioningConfiguration(settings({ url: '   ' }))
    ).toThrow('BILLING_API_URL/BILLING_URL is missing')
  })

  it('fails fast when the shared internal key is missing', () => {
    expect(() =>
      assertFinanceProvisioningConfiguration(settings({ internalKey: '  ' }))
    ).toThrow('BILLING_INTERNAL_KEY is missing')
  })

  it.each(['not-a-url', 'billing-api', '://bad'])(
    'rejects malformed URL %s',
    (url) => {
      expect(() =>
        assertFinanceProvisioningConfiguration(settings({ url }))
      ).toThrow('not a valid URL')
    }
  )

  it.each(['ftp://billing.example.test', 'file:///tmp/billing'])(
    'rejects unsupported scheme %s',
    (url) => {
      expect(() =>
        assertFinanceProvisioningConfiguration(settings({ url }))
      ).toThrow('must use http:// or https://')
    }
  )

  it('rejects embedded URL credentials', () => {
    expect(() =>
      assertFinanceProvisioningConfiguration(
        settings({ url: 'https://user:pass@billing.example.test' })
      )
    ).toThrow('must not contain embedded credentials')
  })

  it.each([
    'https://billing.example.test/api/v1',
    'https://billing.example.test/?region=jm',
    'https://billing.example.test/#finance',
  ])('rejects non-origin Billing target %s', (url) => {
    expect(() =>
      assertFinanceProvisioningConfiguration(settings({ url }))
    ).toThrow('must be a service origin')
  })

  it('accepts localhost HTTP for deliberate local development', () => {
    expect(() =>
      assertFinanceProvisioningConfiguration(
        settings({ url: 'http://127.0.0.1:4004' })
      )
    ).not.toThrow()
  })
})
