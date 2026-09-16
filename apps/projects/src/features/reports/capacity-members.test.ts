import { describe, expect, it } from 'vitest'

import { toMemberOptions } from './capacity-members'

describe('toMemberOptions', () => {
  it('orders members by name so the picker reads alphabetically', () => {
    expect(toMemberOptions({ usr_2: 'Zoe', usr_1: 'Ada' })).toEqual([
      { id: 'usr_1', label: 'Ada' },
      { id: 'usr_2', label: 'Zoe' },
    ])
  })

  it('returns nothing for a directory without members', () => {
    expect(toMemberOptions({})).toEqual([])
  })
})
