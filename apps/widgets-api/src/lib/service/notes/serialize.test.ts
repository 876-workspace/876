import { describe, expect, it } from 'vitest'

import { resolveColor, serializeNote } from './serialize'
import { NOTE_COLORS } from './types'

function createRow(
  overrides: Partial<{
    id: string
    ownerAccountId: string
    collectionId: string | null
    title: string
    body: string
    color: string | null
    pinned: boolean
    createdAt: number
    updatedAt: number
  }> = {}
) {
  return {
    id: 'wnote_2kL9mN4q',
    ownerAccountId: 'user_alejandra',
    collectionId: null as string | null,
    title: 'Sprint retro notes',
    body: 'Discuss shipping the sticky notes dock',
    color: 'yellow',
    pinned: false,
    createdAt: 1_720_000_000,
    updatedAt: 1_720_000_100,
    legacyConvexId: null,
    ...overrides,
  }
}

describe('serializeNote', () => {
  it('when given a Prisma notepad row, then returns a Stripe-style note resource', () => {
    const resource = serializeNote(createRow())

    expect(resource).toEqual({
      object: 'note',
      id: 'wnote_2kL9mN4q',
      owner_account_id: 'user_alejandra',
      collection_id: null,
      title: 'Sprint retro notes',
      body: 'Discuss shipping the sticky notes dock',
      color: 'yellow',
      pinned: false,
      created_at: 1_720_000_000,
      updated_at: 1_720_000_100,
    })
  })

  it('when collectionId is set, then serializes collection_id', () => {
    expect(
      serializeNote(createRow({ collectionId: 'wcol_sprint' })).collection_id
    ).toBe('wcol_sprint')
  })

  it('when color is null, then serializes color as null', () => {
    expect(serializeNote(createRow({ color: null })).color).toBeNull()
  })

  it('when color is an unknown legacy string, then serializes color as null', () => {
    expect(serializeNote(createRow({ color: 'neon' })).color).toBeNull()
  })

  it.each([...NOTE_COLORS])(
    'when color is palette value %s, then it is preserved on the resource',
    (color) => {
      expect(serializeNote(createRow({ color })).color).toBe(color)
    }
  )
})

describe('resolveColor', () => {
  it('when color is missing, then returns null', () => {
    expect(resolveColor(undefined)).toBeNull()
    expect(resolveColor(null)).toBeNull()
    expect(resolveColor('')).toBeNull()
  })

  it('when color is not in the palette, then returns null', () => {
    expect(resolveColor('magenta')).toBeNull()
  })
})
