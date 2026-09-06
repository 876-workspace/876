import { describe, expect, it } from 'vitest'

import { FINANCE_PERMISSION_VALUES } from '@876/core/access/finance-catalog'

import { BILLING_PERMISSION_VALUES } from './permission-values'

describe('Billing finance permission values', () => {
  it('declares exactly the finance catalog permissions', () => {
    expect([...BILLING_PERMISSION_VALUES].sort()).toEqual([
      ...FINANCE_PERMISSION_VALUES,
    ])
  })
})
