import { describe, expect, it } from 'vitest'
import { billingNavigation } from '@876/billing/navigation'

describe('Sales Orders access binding', () => {
  it('binds the navigation destination to the Sales Orders route permission', () => {
    const sales = billingNavigation
      .flatMap((group) => group.entries)
      .find((entry) => entry.key === 'sales')
    const order = sales?.children?.find(
      (entry) => entry.href === '/sales-orders'
    )
    expect(order?.requires?.permission).toBe('sales-orders:read')
  })
})
