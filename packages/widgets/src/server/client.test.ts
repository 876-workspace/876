import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createWidgetsClient } from './client'

const sampleNote = {
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

describe('createWidgetsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('when base URL or service key is missing, then returns widgets/not-configured without fetching', async () => {
    const fetchMock = vi.fn()
    const client = createWidgetsClient({
      baseUrl: '',
      serviceKey: '',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.list({ userId: 'user_alejandra' })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'widgets/not-configured',
        message: 'Widgets API is not configured.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('when listing notes, then sends service key and actor headers to /api/v1/notes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [sampleNote],
            has_more: false,
            url: '/v1/notes',
            total_count: null,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    const client = createWidgetsClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.list(
      { userId: 'user_alejandra' },
      { limit: 10, starting_after: 'wnote_cursor' }
    )

    expect(result.error).toBeNull()
    expect(result.data?.data).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(String(url)).toContain('/api/v1/notes')
    expect(String(url)).toContain('limit=10')
    expect(String(url)).toContain('starting_after=wnote_cursor')
    expect(init.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      'x-internal-key': 'sk_widgets_test',
      'x-876-actor-user-id': 'user_alejandra',
    })
  })

  it('when creating a note, then validates the response against the note schema', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: sampleNote, error: null }), {
        status: 201,
      })
    )
    const client = createWidgetsClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.create(
      { userId: 'user_alejandra' },
      { title: 'Ops checklist', body: 'Verify Hyperdrive binding' }
    )

    expect(result).toEqual({ data: sampleNote, error: null })
  })

  it('when the API returns an unexpected payload shape, then reports widgets/invalid-response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'broken' }, error: null }), {
        status: 200,
      })
    )
    const client = createWidgetsClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.create(
      { userId: 'user_alejandra' },
      { title: 'x', body: '' }
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'widgets/invalid-response',
        message: 'The Widgets API returned an unexpected payload.',
      },
    })
  })

  it('when the API returns an error envelope, then maps code and message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'widgets/invalid-title',
            message: 'Notepad titles must be between 1 and 160 characters.',
          },
        }),
        { status: 400 }
      )
    )
    const client = createWidgetsClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.create(
      { userId: 'user_alejandra' },
      { title: '', body: '' }
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'widgets/invalid-title',
        message: 'Notepad titles must be between 1 and 160 characters.',
      },
    })
  })

  it('when fetch rejects, then returns widgets/network-error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = createWidgetsClient({
      baseUrl: 'https://widgets.876.test',
      serviceKey: 'sk_widgets_test',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.notes.list({ userId: 'user_alejandra' })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'widgets/network-error',
        message: 'Unable to reach the Widgets API.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith('[widgets] request failed', {
      host: 'widgets.876.test',
      path: '/api/v1/notes',
      cause: 'ECONNREFUSED',
    })
  })
})
