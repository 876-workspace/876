import { describe, expect, it, vi } from 'vitest'
import type { AdminListResponse, AdminResult } from '@876/platform/compat'
import { collectCatalogPages } from './catalog-pages'

function page(
  ids: string[],
  hasMore = false
): AdminResult<AdminListResponse<{ id: string }>> {
  return {
    data: {
      object: 'list',
      data: ids.map((id) => ({ id })),
      has_more: hasMore,
      url: '/apps',
      total_count: null,
    },
    error: null,
  }
}

describe('collectCatalogPages', () => {
  it('loads every page in cursor order', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(page(['app_billing'], true))
      .mockResolvedValueOnce(page(['app_invoice']))
    expect(await collectCatalogPages(load)).toEqual({
      data: [{ id: 'app_billing' }, { id: 'app_invoice' }],
      error: null,
    })
    expect(load.mock.calls).toEqual([[undefined], ['app_billing']])
  })

  it('returns a real empty catalog without requesting another page', async () => {
    const load = vi.fn().mockResolvedValue(page([]))
    expect(await collectCatalogPages(load)).toEqual({ data: [], error: null })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('discards partial options and preserves a later page error', async () => {
    const error = {
      code: 'api/unavailable',
      message: 'Catalog is unavailable.',
    }
    const load = vi
      .fn()
      .mockResolvedValueOnce(page(['app_billing'], true))
      .mockResolvedValueOnce({ data: null, error })
    expect(await collectCatalogPages(load)).toEqual({ data: null, error })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('reports a missing payload instead of claiming an empty catalog', async () => {
    const load = vi.fn().mockResolvedValue({ data: null, error: null })
    expect(await collectCatalogPages(load)).toEqual({
      data: null,
      error: {
        code: 'admin/empty-response',
        message: 'Catalog request returned no data and no error.',
      },
    })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty page that claims to have more records', async () => {
    const load = vi.fn().mockResolvedValue(page([], true))
    await expect(collectCatalogPages(load)).rejects.toThrow(
      'Catalog pagination did not advance.'
    )
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('stops a repeated cursor instead of looping forever', async () => {
    const load = vi.fn().mockResolvedValue(page(['app_invoice'], true))
    await expect(collectCatalogPages(load)).rejects.toThrow(
      'Catalog pagination did not advance.'
    )
    expect(load).toHaveBeenCalledTimes(2)
  })
})
