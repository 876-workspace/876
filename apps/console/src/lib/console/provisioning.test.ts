import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  currencies: vi.fn(),
  languages: vi.fn(),
  catalog: vi.fn(),
}))
vi.mock('@/lib/clients/workspace', () => ({
  workspace: {
    geo: { listCurrencies: mocks.currencies, listLanguages: mocks.languages },
    provisioning: { retrieveCatalog: mocks.catalog },
  },
}))

import {
  getProvisioningCatalog,
  getProvisioningReferenceData,
} from './provisioning'

describe('Console provisioning catalogs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('starts independent reference reads together and preserves scoped failures', async () => {
    const pending = Promise.withResolvers<{ data: []; error: null }>()
    const error = { code: 'geo/unavailable', message: 'Languages unavailable.' }
    mocks.currencies.mockReturnValue(pending.promise)
    mocks.languages.mockResolvedValue({ data: null, error })
    const result = getProvisioningReferenceData()
    expect(mocks.currencies).toHaveBeenCalledTimes(1)
    expect(mocks.languages).toHaveBeenCalledTimes(1)
    pending.resolve({ data: [], error: null })
    expect(await result).toEqual({
      currencies: { data: [], error: null },
      languages: { data: null, error },
    })
  })

  it.each(['application', 'finance'] as const)(
    'loads the %s catalog for its exact target',
    async (target) => {
      const result = { data: { resource_types: [] }, error: null }
      mocks.catalog.mockResolvedValue(result)
      expect(await getProvisioningCatalog(target, 'target_123')).toEqual(result)
      expect(mocks.catalog.mock.calls).toEqual([[target, 'target_123']])
      expect(mocks.currencies).not.toHaveBeenCalled()
    }
  )
})
