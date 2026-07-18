import { describe, expect, it } from 'vitest'

import {
  AppFinanceConnectionScopeSchema,
  AppFinanceConnectionStatusSchema,
} from './finance-connection'

describe('app finance connection contracts', () => {
  it('accepts the supported lifecycle states', () => {
    expect(AppFinanceConnectionStatusSchema.parse('ACTIVE')).toBe('ACTIVE')
  })

  it('requires lowercase dotted finance scopes', () => {
    expect(
      AppFinanceConnectionScopeSchema.parse('billing.customers.read')
    ).toBe('billing.customers.read')

    for (const scope of [
      'billing',
      'Billing.customers.read',
      'billing_customers.read',
    ]) {
      expect(AppFinanceConnectionScopeSchema.safeParse(scope).success).toBe(
        false
      )
    }
  })
})
