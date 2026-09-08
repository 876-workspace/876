import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }))
vi.mock('./repositories/item-preferences', () => ({
  itemPreferences: { retrieve: mocks.retrieve },
}))

import {
  requireItemVariantsEnabled,
  resolveItemCapabilities,
} from './item-capabilities.service'

describe('Item capabilities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the canonical Item preference to one capability value', async () => {
    mocks.retrieve.mockResolvedValue({
      object: 'item_preferences',
      productVariants: true,
    })

    await expect(resolveItemCapabilities('ten_1')).resolves.toEqual({
      variantsEnabled: true,
    })
  })

  it('permits Variant workflows only when the capability is enabled', async () => {
    mocks.retrieve.mockResolvedValue({
      object: 'item_preferences',
      productVariants: true,
    })

    await expect(requireItemVariantsEnabled('ten_1')).resolves.toEqual({
      variantsEnabled: true,
    })
  })

  it('uses the registered disabled-Variants domain error', async () => {
    mocks.retrieve.mockResolvedValue({
      object: 'item_preferences',
      productVariants: false,
    })

    await expect(requireItemVariantsEnabled('ten_1')).rejects.toMatchObject({
      code: 'billing/item-variants-disabled',
      httpStatus: 409,
    })
  })
})
