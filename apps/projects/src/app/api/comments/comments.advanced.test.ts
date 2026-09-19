import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiPermission: mocks.requireAccess,
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    comments: {
      retrieve: mocks.retrieve,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.remove,
    },
  },
}))

const { POST } = await import('./route')
const { DELETE, PATCH } = await import('./[commentId]/route')

function postRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function patchRequest(body?: unknown) {
  return new NextRequest(
    'http://localhost/api/comments/cmt_1?issueRef=CONSOLE-12',
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }
  )
}

const context = { params: Promise.resolve({ commentId: 'cmt_1' }) }

function rng(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ALPHABETS = {
  ascii: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_. ',
  unicode: 'héllo世界🎉ÑoñoÆsop—“quoted”‘tis’✓★→',
  markdown: '#*`[]()<>_|~#*`[]()<>_|~#*`[]()<>_|~ \n\t- [ ] > | --- ```',
  hostile: '<>"\'&;$/\\{}()=%00\x00\x01\x7f',
} as const

function sampleCorpus(seed: number, count: number): string[] {
  const next = rng(seed)
  const alphabets = Object.values(ALPHABETS).map((a) => Array.from(a))
  const out: string[] = []
  for (let i = 0; i < count; i += 1) {
    const alphabet = alphabets[Math.floor(next() * alphabets.length)]
    const length = 1 + Math.floor(next() * 200)
    let value = ''
    for (let j = 0; j < length; j += 1)
      value += alphabet[Math.floor(next() * alphabet.length)]
    out.push(value)
  }
  return out
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
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
  mocks.create.mockResolvedValue({
    data: { object: 'projects.comment', id: 'cmt_1' },
    error: null,
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.comment', id: 'cmt_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.comment', id: 'cmt_1', deleted: true },
    error: null,
  })
})

describe('POST /api/comments — boundary matrix', () => {
  it('accepts trimmed bodies across a deterministic hostile corpus', async () => {
    for (const raw of sampleCorpus(42, 40)) {
      vi.clearAllMocks()
      const response = await POST(
        postRequest({ issueRef: 'CONSOLE-12', body: raw })
      )
      const trimmed = raw.trim()
      if (trimmed.length === 0 || trimmed.length > 10000) {
        expect(response.status).toBe(422)
        expect(mocks.create).not.toHaveBeenCalled()
      } else {
        expect(response.status).toBe(201)
        expect(mocks.create).toHaveBeenCalledTimes(1)
      }
    }
  })

  it('holds issue-reference and body length boundaries', async () => {
    for (const length of [119, 120, 121]) {
      vi.clearAllMocks()
      const response = await POST(
        postRequest({ issueRef: 'x'.repeat(length), body: 'Note' })
      )
      expect(response.status).toBe(length <= 120 ? 201 : 422)
    }
    for (const length of [9999, 10000, 10001]) {
      vi.clearAllMocks()
      const response = await POST(
        postRequest({ issueRef: 'CONSOLE-12', body: 'n'.repeat(length) })
      )
      expect(response.status).toBe(length <= 10000 ? 201 : 422)
    }
  })

  it('never leaks the service client error code to the caller', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'projects/internal-boom', message: 'Boom.' },
    })
    const response = await POST(
      postRequest({ issueRef: 'CONSOLE-12', body: 'Note' })
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Boom.' },
    })
  })
})

describe('PATCH /api/comments/[commentId] — ownership boundary', () => {
  it('retrieves ownership using the verified session user before updating', async () => {
    const body = '  修正计划 🎉 — “quoted” ✓  '
    const response = await PATCH(
      patchRequest({ issueRef: 'CONSOLE-12', body }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1')
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1', {
      body: body.trim(),
    })
  })

  it('forbids a non-owner and never mutates the comment', async () => {
    mocks.retrieve.mockResolvedValueOnce({
      data: {
        object: 'projects.comment',
        id: 'cmt_1',
        authorUserId: 'usr_other',
      },
      error: null,
    })

    const response = await PATCH(
      patchRequest({ issueRef: 'CONSOLE-12', body: 'Updated' }),
      context
    )

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects invalid bodies before performing an ownership lookup', async () => {
    const response = await PATCH(
      patchRequest({ issueRef: 'CONSOLE-12', body: '   ' }),
      context
    )
    expect(response.status).toBe(422)
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/comments/[commentId] — ownership boundary', () => {
  it('decodes and trims the issue reference before ownership check and delete', async () => {
    const url =
      'http://localhost/api/comments/cmt_1?issueRef=%20%20CONSOLE-12%20%20'
    const response = await DELETE(
      new NextRequest(url, { method: 'DELETE' }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1')
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1')
  })

  it('forbids a non-owner and never deletes', async () => {
    mocks.retrieve.mockResolvedValueOnce({
      data: {
        object: 'projects.comment',
        id: 'cmt_1',
        authorUserId: 'usr_other',
      },
      error: null,
    })
    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/comments/cmt_1?issueRef=CONSOLE-12',
        { method: 'DELETE' }
      ),
      context
    )
    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('returns 404 when ownership lookup cannot find the comment', async () => {
    mocks.retrieve.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'projects/comment-not-found',
        message: 'Comment not found.',
      },
    })
    const response = await DELETE(
      new NextRequest(
        'http://localhost/api/comments/cmt_1?issueRef=CONSOLE-12',
        { method: 'DELETE' }
      ),
      context
    )
    expect(response.status).toBe(404)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
