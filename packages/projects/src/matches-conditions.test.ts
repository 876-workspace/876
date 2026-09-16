import { describe, expect, it } from 'vitest'

import { matchesConditions, type LayoutCondition } from './layout-rules'

function condition(overrides: Partial<LayoutCondition>): LayoutCondition {
  return { fieldKey: 'state', op: 'equals', value: 'done', ...overrides }
}

describe('matchesConditions', () => {
  it('matches an empty condition list', () => {
    expect(matchesConditions([], { state: 'todo' })).toBe(true)
  })

  it('matches equals against scalar values', () => {
    expect(
      matchesConditions([condition({})], { state: 'done' })
    ).toBe(true)
    expect(
      matchesConditions([condition({})], { state: 'todo' })
    ).toBe(false)
  })

  it('matches not-equals', () => {
    expect(
      matchesConditions([condition({ op: 'not-equals' })], { state: 'todo' })
    ).toBe(true)
  })

  it('matches membership with in', () => {
    const when = [condition({ op: 'in', value: ['done', 'canceled'] })]
    expect(matchesConditions(when, { state: 'canceled' })).toBe(true)
    expect(matchesConditions(when, { state: 'todo' })).toBe(false)
  })

  it('matches array values with in', () => {
    const when = [condition({ fieldKey: 'labels', op: 'in', value: ['lbl_1'] })]
    expect(matchesConditions(when, { labels: ['lbl_1', 'lbl_2'] })).toBe(true)
    expect(matchesConditions(when, { labels: ['lbl_9'] })).toBe(false)
  })

  it('matches emptiness', () => {
    expect(
      matchesConditions(
        [condition({ fieldKey: 'assignee', op: 'is-empty' })],
        { assignee: null }
      )
    ).toBe(true)
    expect(
      matchesConditions(
        [condition({ fieldKey: 'assignee', op: 'is-not-empty' })],
        { assignee: 'user_1' }
      )
    ).toBe(true)
  })

  it('requires every condition to match', () => {
    const when = [
      condition({}),
      condition({ fieldKey: 'priority', op: 'equals', value: 'high' }),
    ]
    expect(
      matchesConditions(when, { state: 'done', priority: 'high' })
    ).toBe(true)
    expect(
      matchesConditions(when, { state: 'done', priority: 'low' })
    ).toBe(false)
  })

  it('treats missing values as empty', () => {
    expect(
      matchesConditions(
        [condition({ fieldKey: 'assignee', op: 'is-empty' })],
        {}
      )
    ).toBe(true)
  })
})
