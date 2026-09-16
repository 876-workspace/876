import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiPermission: mocks.requirePermission,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    comments: {
      retrieve: mocks.retrieve,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}))

const { DELETE, PATCH } = await import('./route')
const context = { params: Promise.resolve({ commentId: 'cmt_1' }) }

function request(method: 'PATCH' | 'DELETE', body?: unknown) {
  return new NextRequest(
    'http://localhost/api/comments/cmt_1?issueRef=CONSOLE-12',
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requirePermission.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.retrieve.mockResolvedValue({
    data: {
      object: 'projects.comment',
      id: 'cmt_1',
      authorUserId: 'usr_1',
    },
    error: null,
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.comment', id: 'cmt_1' },
    error: null,
  })
  mocks.delete.mockResolvedValue({
    data: { object: 'projects.comment', id: 'cmt_1', deleted: true },
    error: null,
  })
})

describe('/api/comments/[commentId]', () => {
  it('updates a comment through the authorized organization and session user', async () => {
    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: 'Updated' }),
      context
    )

    expect(mocks.requirePermission).toHaveBeenCalledWith('comments.edit')
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1', {
      body: 'Updated',
    })
    expect(response.status).toBe(200)
  })

  it('rejects an update without a valid body', async () => {
    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('deletes a comment through the authorized organization and session user', async () => {
    const response = await DELETE(request('DELETE'), context)

    expect(mocks.requirePermission).toHaveBeenCalledWith('comments.delete')
    expect(mocks.delete).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { object: 'projects.comment', id: 'cmt_1', deleted: true },
      error: null,
    })
  })

  it('returns the authorization response for an update without calling the client', async () => {
    mocks.requirePermission.mockResolvedValue({
      response: new Response('{"error":"Unauthorized."}', { status: 401 }),
    })

    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: 'Updated' }),
      context
    )

    expect(response.status).toBe(401)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns the authorization response for a delete without calling the client', async () => {
    mocks.requirePermission.mockResolvedValue({
      response: new Response('{"error":"Unauthorized."}', { status: 403 }),
    })

    const response = await DELETE(request('DELETE'), context)

    expect(response.status).toBe(403)
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('rejects an update with malformed JSON without calling the client', async () => {
    const malformed = new NextRequest(
      'http://localhost/api/comments/cmt_1?issueRef=CONSOLE-12',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{"issueRef": "CONSOLE-12", "body": ',
      }
    )

    const response = await PATCH(malformed, context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an update with a whitespace-only body', async () => {
    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: '   ' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an update with a body longer than 10000 characters', async () => {
    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: 'z'.repeat(10001) }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an update with unknown fields', async () => {
    const response = await PATCH(
      request('PATCH', {
        issueRef: 'CONSOLE-12',
        body: 'Updated',
        editedBy: 'mallory',
      }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an update missing the issue reference', async () => {
    const response = await PATCH(request('PATCH', { body: 'Updated' }), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('trims the updated body before saving', async () => {
    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: '  Revised plan\n' }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1', {
      body: 'Revised plan',
    })
  })

  it('passes the comment id from the route params to the client', async () => {
    const other = { params: Promise.resolve({ commentId: 'cmt_99' }) }

    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: 'Updated' }),
      other
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_99', {
      body: 'Updated',
    })
  })

  it('maps an issue-not-found update error to 404 rather than trusting the internal httpStatus', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'The issue no longer exists.',
        httpStatus: 404,
      },
    })

    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: 'Updated' }),
      context
    )

    expect(response.status).toBe(404)
    expect((await response.json()).data).toBeNull()
  })

  it('maps a comment-not-found update error to 404', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/comment-not-found',
        message: 'The comment no longer exists.',
        httpStatus: 404,
      },
    })

    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: 'Updated' }),
      context
    )

    expect(response.status).toBe(404)
    expect((await response.json()).data).toBeNull()
  })

  it('returns a null error alongside updated comment data', async () => {
    const response = await PATCH(
      request('PATCH', { issueRef: 'CONSOLE-12', body: 'Updated' }),
      context
    )

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.error).toBeNull()
    expect(json.data).toEqual({ object: 'projects.comment', id: 'cmt_1' })
  })

  it('rejects a delete without an issue reference', async () => {
    const bare = new NextRequest('http://localhost/api/comments/cmt_1', {
      method: 'DELETE',
    })

    const response = await DELETE(bare, context)

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'validation/invalid-request',
        message: 'An issue reference is required.',
      },
    })
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('rejects a delete with a whitespace-only issue reference', async () => {
    const blank = new NextRequest(
      'http://localhost/api/comments/cmt_1?issueRef=%20%20',
      { method: 'DELETE' }
    )

    const response = await DELETE(blank, context)

    expect(response.status).toBe(422)
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('ignores a request body on delete and deletes by query reference', async () => {
    const withBody = new NextRequest(
      'http://localhost/api/comments/cmt_1?issueRef=CONSOLE-12',
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ extra: 'ignored' }),
      }
    )

    const response = await DELETE(withBody, context)

    expect(response.status).toBe(200)
    expect(mocks.delete).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1')
  })

  it('passes the comment id from the route params to the delete client', async () => {
    const other = { params: Promise.resolve({ commentId: 'cmt_42' }) }

    const response = await DELETE(request('DELETE'), other)

    expect(response.status).toBe(200)
    expect(mocks.delete).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_42')
  })

  it('maps an issue-not-found delete error to 404 rather than trusting the internal httpStatus', async () => {
    mocks.delete.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'The issue no longer exists.',
        httpStatus: 404,
      },
    })

    const response = await DELETE(request('DELETE'), context)

    expect(response.status).toBe(404)
    expect((await response.json()).data).toBeNull()
  })

  it('maps a comment-not-found delete error to 404', async () => {
    mocks.delete.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/comment-not-found',
        message: 'The comment no longer exists.',
        httpStatus: 404,
      },
    })

    const response = await DELETE(request('DELETE'), context)

    expect(response.status).toBe(404)
    expect((await response.json()).data).toBeNull()
  })
})
