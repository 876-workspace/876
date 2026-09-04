import { beforeEach, describe, expect, it, vi } from 'vitest'

import { commentsClient } from './projects'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof globalThis.fetch>()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

function lastCall(): { url: unknown; init: RequestInit | undefined } {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('expected fetch to be called')
  return { url: call[0], init: call[1] }
}

describe('commentsClient.create', () => {
  it('posts the issue reference and body to the comments route', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { data: { object: 'projects.comment', id: 'cmt_1' }, error: null },
        201
      )
    )

    const result = await commentsClient.create({
      issueRef: 'CONSOLE-12',
      body: 'Ship the fix behind the flag.',
    })

    const { url, init } = lastCall()
    expect(url).toBe('/api/comments')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('content-type')).toBe(
      'application/json'
    )
    expect(JSON.parse(init?.body as string)).toEqual({
      issueRef: 'CONSOLE-12',
      body: 'Ship the fix behind the flag.',
    })
    expect(result).toEqual({
      data: { object: 'projects.comment', id: 'cmt_1' },
      error: null,
    })
  })

  it('passes a validation error through without HTTP metadata', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          data: null,
          error: {
            code: 'validation/invalid-request',
            message: 'Enter a comment.',
          },
        },
        422
      )
    )

    const result = await commentsClient.create({
      issueRef: 'CONSOLE-12',
      body: '',
    })

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({
      code: 'validation/invalid-request',
      message: 'Enter a comment.',
    })
  })

  it('returns a shared error value when the network is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await commentsClient.create({
      issueRef: 'CONSOLE-12',
      body: 'Note',
    })

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})

describe('commentsClient.update', () => {
  it('patches the comment route with the edited body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { object: 'projects.comment', id: 'cmt_1' },
        error: null,
      })
    )

    const result = await commentsClient.update('cmt_1', {
      issueRef: 'CONSOLE-12',
      body: 'Revised plan',
    })

    const { url, init } = lastCall()
    expect(url).toBe('/api/comments/cmt_1')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(init?.body as string)).toEqual({
      issueRef: 'CONSOLE-12',
      body: 'Revised plan',
    })
    expect(result.error).toBeNull()
  })

  it('encodes comment ids that are unsafe in a path', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { object: 'projects.comment', id: 'cmt 1' },
        error: null,
      })
    )

    await commentsClient.update('cmt 1/x', {
      issueRef: 'CONSOLE-12',
      body: 'Revised plan',
    })

    expect(lastCall().url).toBe('/api/comments/cmt%201%2Fx')
  })

  it('passes a missing-comment error through to the caller', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          data: null,
          error: { code: 'error/bad-request', message: 'Comment not found.' },
        },
        400
      )
    )

    const result = await commentsClient.update('cmt_missing', {
      issueRef: 'CONSOLE-12',
      body: 'Revised plan',
    })

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({ message: 'Comment not found.' })
  })
})

describe('commentsClient.delete', () => {
  it('deletes through the comment route with the issue reference query', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { object: 'projects.comment', id: 'cmt_1', deleted: true },
        error: null,
      })
    )

    const result = await commentsClient.delete('cmt_1', 'CONSOLE-12')

    const { url, init } = lastCall()
    expect(url).toBe('/api/comments/cmt_1?issueRef=CONSOLE-12')
    expect(init?.method).toBe('DELETE')
    expect(result.data).toEqual({
      object: 'projects.comment',
      id: 'cmt_1',
      deleted: true,
    })
  })

  it('encodes both the comment id and the issue reference', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { object: 'projects.comment', id: 'cmt 1', deleted: true },
        error: null,
      })
    )

    await commentsClient.delete('cmt 1', 'CONSOLE 12')

    expect(lastCall().url).toBe('/api/comments/cmt%201?issueRef=CONSOLE%2012')
  })

  it('passes a delete failure through to the caller', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          data: null,
          error: { code: 'error/bad-request', message: 'Comment not found.' },
        },
        400
      )
    )

    const result = await commentsClient.delete('cmt_missing', 'CONSOLE-12')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})
