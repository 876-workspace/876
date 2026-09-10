import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ modules: vi.fn(), features: vi.fn() }))
vi.mock('@/lib/services/workspace', () => ({
  workspace: {
    modules: { list: mocks.modules },
    features: { list: mocks.features },
  },
}))

import { listAppModules, listModuleFeatures } from './modules'

describe('Console module catalogs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads all root rollout options within the selected application', async () => {
    mocks.features
      .mockResolvedValueOnce({
        data: { data: [{ id: 'flag_first' }], has_more: true },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'flag_last' }], has_more: false },
        error: null,
      })
    expect(await listModuleFeatures('app_invoice')).toEqual({
      data: [{ id: 'flag_first' }, { id: 'flag_last' }],
      error: null,
    })
    expect(mocks.features.mock.calls).toEqual([
      [
        {
          appId: 'app_invoice',
          rootOnly: true,
          limit: 100,
          startingAfter: undefined,
        },
      ],
      [
        {
          appId: 'app_invoice',
          rootOnly: true,
          limit: 100,
          startingAfter: 'flag_first',
        },
      ],
    ])
  })

  it('preserves module failures and forwards archived visibility', async () => {
    const result = {
      data: null,
      error: { code: 'api/unavailable', message: 'Modules unavailable.' },
    }
    mocks.modules.mockResolvedValue(result)
    expect(await listAppModules('app_invoice', true)).toEqual(result)
    expect(mocks.modules.mock.calls).toEqual([
      ['app_invoice', { includeArchived: true }],
    ])
    expect(mocks.features).not.toHaveBeenCalled()
  })
})
