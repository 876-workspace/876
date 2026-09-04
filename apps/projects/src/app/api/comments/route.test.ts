import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiPermission: mocks.requirePermission,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { comments: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body?: unknown) {
  return new NextRequest('http://localhost/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requirePermission.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.create.mockResolvedValue({
    data: { object: 'projects.comment', id: 'cmt_1' },
    error: null,
  })
})

describe('POST /api/comments', () => {
  it('returns the authorization response without calling the client', async () => {
    mocks.requirePermission.mockResolvedValue({
      response: new Response('{"error":"Unauthorized."}', { status: 401 }),
    })

    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'Note' })
    )

    expect(response.status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an invalid body without calling the client', async () => {
    const response = await POST(request({ issueRef: 'CONSOLE-12', body: '' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a comment scoped to the authorized user and organization', async () => {
    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'Note' })
    )

    expect(mocks.requirePermission).toHaveBeenCalledWith('comments.create')
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'CONSOLE-12', {
      body: 'Note',
      authorUserId: 'usr_1',
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { object: 'projects.comment', id: 'cmt_1' },
      error: null,
    })
  })

  it('returns a service error without inventing a success response', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'projects/issue-not-found', message: 'Issue not found.' },
    })

    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'Note' })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Issue not found.' },
    })
  })

  it('rejects a missing JSON body without calling the client', async () => {
    const response = await POST(request(undefined))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON without calling the client', async () => {
    const malformed = new NextRequest('http://localhost/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"issueRef": "CONSOLE-12", "body": ',
    })

    const response = await POST(malformed)

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects unknown top-level fields without calling the client', async () => {
    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'Note', author: 'mallory' })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a missing issue reference without calling the client', async () => {
    const response = await POST(request({ body: 'Note' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only issue reference without calling the client', async () => {
    const response = await POST(request({ issueRef: '   ', body: 'Note' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only body without calling the client', async () => {
    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: '   \n\t  ' })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an issue reference longer than 120 characters', async () => {
    const response = await POST(
      request({ issueRef: `${'A'.repeat(115)}-123456`, body: 'Note' })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a body longer than 10000 characters', async () => {
    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'x'.repeat(10001) })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('trims surrounding whitespace before creating the comment', async () => {
    const response = await POST(
      request({ issueRef: '  CONSOLE-12  ', body: '  Ship the fix\n' })
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'CONSOLE-12', {
      body: 'Ship the fix',
      authorUserId: 'usr_1',
    })
  })

  it('accepts a body at exactly the 10000 character limit', async () => {
    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'y'.repeat(10000) })
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalled()
  })

  it('passes a permission failure message through to the caller', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/comment-forbidden',
        message: 'Only members may comment.',
      },
    })

    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'Note' })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'Only members may comment.',
      },
    })
  })

  it('returns a null error alongside created comment data', async () => {
    const response = await POST(
      request({ issueRef: 'CONSOLE-12', body: 'Note' })
    )

    const json = await response.json()

    expect(json.error).toBeNull()
    expect(json.data).toEqual({ object: 'projects.comment', id: 'cmt_1' })
  })
})
