import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createWidgetsAdminClient } from './admin'

function createNote() {
  return {
    object: 'note' as const,
    id: 'wnote_1',
    owner_account_id: 'user_alejandra',
    title: 'Ops checklist',
    body: 'Verify Hyperdrive binding',
    color: 'yellow' as const,
    pinned: false,
    created_at: 100,
    updated_at: 200,
  }
}

describe('createWidgetsAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('when base URL or service key is missing, then returns widgets/not-configured without fetching', async () => {
    const fetchMock = vi.fn()
    const client = createWidgetsAdminClient({
      baseUrl: '',
      serviceKey: '',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.list({ userId: 'user_console_admin' })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'widgets/not-configured',
        message: 'Widgets API is not configured.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('when listing notes, then sends all filters and the baked-in admin role header', async () => {
    const note = createNote()
    const responseData = {
      object: 'list' as const,
      data: [note],
      has_more: false,
      url: '/v1/admin/notes',
      total_count: 1,
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: responseData, error: null }), {
        status: 200,
      })
    )
    const client = createWidgetsAdminClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.list(
      { userId: 'user_console_admin' },
      {
        owner_account_id: 'user_alejandra',
        limit: 25,
        starting_after: 'wnote_cursor',
      }
    )

    expect(result).toEqual({ data: responseData, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'https://widgets.876.test/api/v1/admin/notes?owner_account_id=user_alejandra&limit=25&starting_after=wnote_cursor'
      ),
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-internal-key': 'sk_widgets_test',
          'x-876-actor-user-id': 'user_console_admin',
          'x-876-widget-role': 'admin',
        },
        body: undefined,
        cache: 'no-store',
      }
    )
  })

  it('when updating a note, then uses the admin item path and returns the validated note', async () => {
    const note = createNote()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: note, error: null }), {
        status: 200,
      })
    )
    const client = createWidgetsAdminClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.update(
      { userId: 'user_console_admin' },
      'wnote/1',
      { title: 'Ops checklist', pinned: true }
    )

    expect(result).toEqual({ data: note, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://widgets.876.test/api/v1/admin/notes/wnote%2F1'),
      {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-internal-key': 'sk_widgets_test',
          'x-876-actor-user-id': 'user_console_admin',
          'x-876-widget-role': 'admin',
        },
        body: JSON.stringify({ title: 'Ops checklist', pinned: true }),
        cache: 'no-store',
      }
    )
  })

  it('when deleting a note, then uses the admin item path and returns the validated tombstone', async () => {
    const deletedNote = {
      object: 'note' as const,
      id: 'wnote_1',
      deleted: true as const,
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: deletedNote, error: null }), {
        status: 200,
      })
    )
    const client = createWidgetsAdminClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.delete(
      { userId: 'user_console_admin' },
      'wnote_1'
    )

    expect(result).toEqual({ data: deletedNote, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://widgets.876.test/api/v1/admin/notes/wnote_1'),
      {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-internal-key': 'sk_widgets_test',
          'x-876-actor-user-id': 'user_console_admin',
          'x-876-widget-role': 'admin',
        },
        body: undefined,
        cache: 'no-store',
      }
    )
  })

  it('when fetch rejects, then logs diagnostics and returns the unchanged network-error envelope', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = createWidgetsAdminClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.list({ userId: 'user_console_admin' })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'widgets/network-error',
        message: 'Unable to reach the Widgets API.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith('[widgets] request failed', {
      host: 'widgets.876.test',
      path: '/api/v1/admin/notes',
      cause: 'ECONNREFUSED',
    })
  })
})
