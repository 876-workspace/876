import { describe, expect, it } from 'vitest'

import { SubscriptionCustomViewCreateSchema } from './subscription'

const base = {
  name: 'Renewing soon',
  visibility: 'PRIVATE' as const,
  isFavorite: false,
  sortField: 'currentPeriodEnd' as const,
  sortDirection: 'asc' as const,
  columns: ['customer', 'status'] as const,
}

describe('SubscriptionCustomViewCreateSchema', () => {
  it('accepts a normalized date rule', () => {
    expect(
      SubscriptionCustomViewCreateSchema.safeParse({
        ...base,
        columns: [...base.columns],
        rules: [
          {
            field: 'currentPeriodEnd',
            operator: 'BEFORE',
            value: '1735689600',
          },
        ],
      }).success
    ).toBe(true)
  })

  it('rejects invalid enum values before they reach Prisma', () => {
    const parsed = SubscriptionCustomViewCreateSchema.safeParse({
      ...base,
      columns: [...base.columns],
      rules: [{ field: 'status', operator: 'EQUALS', value: 'RUNNING' }],
    })

    expect(parsed.success).toBe(false)
  })

  it('requires values for comparison rules', () => {
    const parsed = SubscriptionCustomViewCreateSchema.safeParse({
      ...base,
      columns: [...base.columns],
      rules: [{ field: 'customerName', operator: 'CONTAINS', value: '' }],
    })

    expect(parsed.success).toBe(false)
  })
})
