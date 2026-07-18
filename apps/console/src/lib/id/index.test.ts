import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CONSOLE_ID_PREFIXES, generateId } from './index'

const { createPrefixedId } = vi.hoisted(() => ({ createPrefixedId: vi.fn() }))

vi.mock('@876/core/id', () => ({ createPrefixedId }))

describe('Console IDs', () => {
  beforeEach(() => {
    createPrefixedId.mockReturnValue('nte_01JABCDEF')
    vi.clearAllMocks()
  })

  it('publishes the local datastore prefix catalog', () => {
    expect(CONSOLE_ID_PREFIXES).toEqual({ note: 'nte' })
  })

  it('generates a note ID through the shared prefix generator', () => {
    const result = generateId('note')

    expect(result).toBe('nte_01JABCDEF')
    expect(createPrefixedId).toHaveBeenCalledTimes(1)
    expect(createPrefixedId).toHaveBeenCalledWith('nte')
  })
})
