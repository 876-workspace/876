import { describe, expect, it } from 'vitest'

import { resolveDueAt } from './due-date'

const ISSUE_AT = Date.UTC(2026, 0, 15, 12, 0, 0) / 1000

describe('payment term due dates', () => {
  it('supports due-on-receipt and net-day terms', () => {
    expect(resolveDueAt(ISSUE_AT, { rule: 'DUE_ON_RECEIPT', dueDays: 0 })).toBe(
      ISSUE_AT
    )
    expect(resolveDueAt(ISSUE_AT, { rule: 'NET_DAYS', dueDays: 30 })).toBe(
      ISSUE_AT + 30 * 86_400
    )
  })

  it('uses the final UTC second of this or next month', () => {
    expect(resolveDueAt(ISSUE_AT, { rule: 'END_OF_MONTH', dueDays: 0 })).toBe(
      Date.UTC(2026, 0, 31, 23, 59, 59) / 1000
    )
    expect(
      resolveDueAt(ISSUE_AT, { rule: 'END_OF_NEXT_MONTH', dueDays: 0 })
    ).toBe(Date.UTC(2026, 1, 28, 23, 59, 59) / 1000)
  })
})
