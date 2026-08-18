import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  browserCollections,
  browserNotes,
  configureBrowserNotepadRoutes,
  resetBrowserNotepadRoutes,
} from './notes'

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ data, error: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('browser Notepad host routes', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    resetBrowserNotepadRoutes()
    vi.unstubAllGlobals()
  })

  it('lets a host own member, collection, and admin route vocabulary', async () => {
    configureBrowserNotepadRoutes({
      notes: '/api/notes',
      collections: '/api/note-collections',
      adminNotes: '/api/notes/admin',
    })
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [], has_more: false })
      )
      .mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [], has_more: false })
      )
      .mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [], has_more: false })
      )

    await browserNotes.list()
    await browserCollections.list()
    await browserNotes.listAll()

    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      '/api/notes',
      '/api/note-collections',
      '/api/notes/admin',
    ])
  })
})
