import { describe, expect, it } from 'vitest'

import { toCursorQuery } from './index'

describe('toCursorQuery', () => {
  it('maps camelCase cursor params to wire keys', () => {
    expect(
      toCursorQuery({
        limit: 25,
        startingAfter: 'usr_1',
        endingBefore: 'usr_0',
      })
    ).toEqual({
      limit: 25,
      startingAfter: 'usr_1',
      endingBefore: 'usr_0',
    })
  })

  it('preserves undefined fields so the query serializer can drop them', () => {
    expect(toCursorQuery({ limit: 10 })).toEqual({
      limit: 10,
      startingAfter: undefined,
      endingBefore: undefined,
    })
  })

  it('returns only undefined fields for an empty params object', () => {
    expect(toCursorQuery()).toEqual({
      limit: undefined,
      startingAfter: undefined,
      endingBefore: undefined,
    })
  })
})
