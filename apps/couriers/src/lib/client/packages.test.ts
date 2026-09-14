import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { create, update } from './packages'

describe('packages browser client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { id: 'pkg_1' }, error: null })
  })

  it('creates a package at the management endpoint with the organization envelope', async () => {
    await create('island-logistics', { customer_id: 'cpr_1' })

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/manage/packages', {
      method: 'POST',
      body: JSON.stringify({
        orgSlug: 'island-logistics',
        customer_id: 'cpr_1',
      }),
    })
  })

  it('sends nullable optional creation fields without dropping them', async () => {
    await create('island-logistics', {
      customer_id: 'cpr_1',
      branch_id: null,
      category_id: null,
      tracking_num: null,
    })

    expect(mocks.request).toHaveBeenCalledWith('/api/manage/packages', {
      method: 'POST',
      body: JSON.stringify({
        orgSlug: 'island-logistics',
        customer_id: 'cpr_1',
        branch_id: null,
        category_id: null,
        tracking_num: null,
      }),
    })
  })

  it('updates a package through its encoded management endpoint', async () => {
    await update('island-logistics', 'pkg_1/876', { category_id: 'pcat_1' })

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/manage/packages/pkg_1%2F876',
      {
        method: 'PATCH',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          category_id: 'pcat_1',
        }),
      }
    )
  })

  it('sends null when an update clears an optional field', async () => {
    await update('island-logistics', 'pkg_1', {
      category_id: null,
      description: null,
      actual_weight: null,
    })

    expect(mocks.request).toHaveBeenCalledWith('/api/manage/packages/pkg_1', {
      method: 'PATCH',
      body: JSON.stringify({
        orgSlug: 'island-logistics',
        category_id: null,
        description: null,
        actual_weight: null,
      }),
    })
  })
})
