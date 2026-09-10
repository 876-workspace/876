import 'server-only'

import type { AdminListResponse, AdminResult } from '@876/platform/compat'

/** Complete option catalogs must not silently stop at the API's page limit. */
export async function collectCatalogPages<T extends { id: string }>(
  loadPage: (
    startingAfter?: string
  ) => Promise<AdminResult<AdminListResponse<T>>>
): Promise<AdminResult<T[]>> {
  const items: T[] = []
  const cursors = new Set<string>()
  let startingAfter: string | undefined

  for (;;) {
    const result = await loadPage(startingAfter)
    if (result.error) return { data: null, error: result.error }
    if (!result.data)
      return {
        data: null,
        error: {
          code: 'admin/empty-response',
          message: 'Catalog request returned no data and no error.',
        },
      }

    items.push(...result.data.data)
    if (!result.data.has_more) return { data: items, error: null }

    const cursor = result.data.data.at(-1)?.id
    if (!cursor || cursors.has(cursor))
      throw new Error('Catalog pagination did not advance.')

    cursors.add(cursor)
    startingAfter = cursor
  }
}
