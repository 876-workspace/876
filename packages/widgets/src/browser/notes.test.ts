import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { browserNotes } from './notes'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('browserNotes host client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('list', () => {
    it('when listing notes, then calls the member route with query params and same-origin credentials', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            url: '/v1/notes',
            total_count: null,
          },
          error: null,
        })
      )

      const result = await browserNotes.list({
        limit: 25,
        starting_after: 'wnote_cursor',
      })

      expect(result.error).toBeNull()
      expect(result.data?.object).toBe('list')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/widgets/notepad?limit=25&starting_after=wnote_cursor',
        expect.objectContaining({
          credentials: 'same-origin',
          cache: 'no-store',
        })
      )
    })
  })

  describe('create', () => {
    it('when creating a note, then POSTs JSON to the member collection route', async () => {
      const note = {
        object: 'note',
        id: 'wnote_new',
        owner_account_id: 'user_alejandra',
        collection_id: null,
        title: 'Untitled note',
        body: '',
        color: 'yellow',
        pinned: false,
        created_at: 10,
        updated_at: 10,
      }
      fetchMock.mockResolvedValue(
        jsonResponse({ data: note, error: null }, 201)
      )

      const result = await browserNotes.create({
        title: 'Untitled note',
        body: '',
        color: 'pink',
      })

      expect(result).toEqual({ data: note, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/widgets/notepad',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Untitled note',
            body: '',
            color: 'pink',
          }),
        })
      )
    })
  })

  describe('update / delete', () => {
    it('when updating a note, then PATCHes the encoded member item route', async () => {
      const note = {
        object: 'note',
        id: 'wnote with/slash',
        owner_account_id: 'user_alejandra',
        collection_id: null,
        title: 'Renamed',
        body: 'Body',
        color: 'blue',
        pinned: true,
        created_at: 1,
        updated_at: 2,
      }
      fetchMock.mockResolvedValue(jsonResponse({ data: note, error: null }))

      await browserNotes.update('wnote with/slash', {
        title: 'Renamed',
        pinned: true,
      })

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/widgets/notepad/${encodeURIComponent('wnote with/slash')}`,
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('when deleting a note, then DELETEs the member item route and returns the tombstone', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: { object: 'note', id: 'wnote_1', deleted: true },
          error: null,
        })
      )

      const result = await browserNotes.delete('wnote_1')

      expect(result).toEqual({
        data: { object: 'note', id: 'wnote_1', deleted: true },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/widgets/notepad/wnote_1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('admin surface', () => {
    it('when listing all notes with an owner filter, then hits the admin route', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            url: '/v1/admin/notes',
            total_count: null,
          },
          error: null,
        })
      )

      await browserNotes.listAll({
        owner_account_id: 'user_target',
        limit: 50,
      })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/widgets/admin/notepad?owner_account_id=user_target&limit=50',
        expect.any(Object)
      )
    })

    it('when adminDelete succeeds, then returns the deleted tombstone', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: { object: 'note', id: 'wnote_admin', deleted: true },
          error: null,
        })
      )

      const result = await browserNotes.adminDelete('wnote_admin')

      expect(result.data?.deleted).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/widgets/admin/notepad/wnote_admin',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('error handling', () => {
    it('when the host returns a structured error, then surfaces the message and status', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            data: null,
            error: { message: 'Access to the notepad widget is disabled.' },
          },
          403
        )
      )

      const result = await browserNotes.list()

      expect(result).toEqual({
        data: null,
        error: 'Access to the notepad widget is disabled.',
        status: 403,
      })
    })

    it('when the host returns a string error, then surfaces that string', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ data: null, error: 'Unauthorized.' }, 401)
      )

      const result = await browserNotes.create({ title: 'x', body: '' })

      expect(result).toEqual({
        data: null,
        error: 'Unauthorized.',
        status: 401,
      })
    })

    it('when the response is ok but missing data, then reports an invalid host response', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: null }))

      const result = await browserNotes.list()

      expect(result).toEqual({
        data: null,
        error: 'Invalid response from host.',
      })
    })

    it('when fetch throws a network error, then returns a reachability message', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await browserNotes.list()

      expect(result).toEqual({
        data: null,
        error: 'Unable to reach the widget service.',
      })
    })
  })
})
