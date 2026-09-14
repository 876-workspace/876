import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./request', () => ({
  request: mocks.request,
}))

import { packageCategories } from './package-categories'

describe('client.packageCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { id: 'pcat_1' }, error: null })
  })

  it('creates categories against POST /api/manage/package-categories with orgSlug in the body', async () => {
    await packageCategories.create('island-logistics', {
      name: 'Fragile',
      slug: 'fragile',
      description: 'Handle with care.',
      sort_order: 10,
      is_active: true,
    })

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/manage/package-categories',
      {
        method: 'POST',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          name: 'Fragile',
          slug: 'fragile',
          description: 'Handle with care.',
          sort_order: 10,
          is_active: true,
        }),
      }
    )
  })

  it('updates categories against PATCH with the encoded id in the path', async () => {
    await packageCategories.update('island-logistics', 'pcat/a b', {
      name: 'Extra Fragile',
      is_active: false,
    })

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/manage/package-categories/pcat%2Fa%20b',
      {
        method: 'PATCH',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          name: 'Extra Fragile',
          is_active: false,
        }),
      }
    )
  })

  it('archives categories against DELETE with orgSlug in the query and no body', async () => {
    await packageCategories.archive('island-logistics', 'pcat/a b')

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/manage/package-categories/pcat%2Fa%20b?orgSlug=island-logistics',
      { method: 'DELETE' }
    )
  })
})
