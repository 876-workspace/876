import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiPermission: mocks.requirePermission,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    comments: {
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

// Deterministic PRNG (mulberry32) so the corpus is stable run to run.
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
  mocks.requirePermission.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
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
  it('accepts bodies across a deterministic hostile corpus when trimmed content fits', async () => {
    // Arrange
    const corpus = sampleCorpus(42, 60)

    // Act + Assert
    for (const raw of corpus) {
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

  it('accepts issue references across a deterministic corpus when within limits', async () => {
    // Arrange
    const corpus = sampleCorpus(7, 60)

    // Act + Assert
    for (const raw of corpus) {
      vi.clearAllMocks()
      const response = await POST(postRequest({ issueRef: raw, body: 'Note' }))
      const trimmed = raw.trim()

      if (trimmed.length === 0 || trimmed.length > 120) {
        expect(response.status).toBe(422)
        expect(mocks.create).not.toHaveBeenCalled()
      } else {
        expect(response.status).toBe(201)
      }
    }
  })

  it('holds the exact length limits 119/120/121 for the issue reference', async () => {
    // Arrange
    const cases = [
      { length: 119, accepted: true },
      { length: 120, accepted: true },
      { length: 121, accepted: false },
    ]

    // Act + Assert
    for (const { length, accepted } of cases) {
      vi.clearAllMocks()
      const response = await POST(
        postRequest({ issueRef: 'x'.repeat(length), body: 'Note' })
      )

      expect(response.status).toBe(accepted ? 201 : 422)
      expect(mocks.create).toHaveBeenCalledTimes(accepted ? 1 : 0)
    }
  })

  it('holds the exact length limits 9999/10000/10001 for the body', async () => {
    // Arrange
    const cases = [
      { length: 9999, accepted: true },
      { length: 10000, accepted: true },
      { length: 10001, accepted: false },
    ]

    // Act + Assert
    for (const { length, accepted } of cases) {
      vi.clearAllMocks()
      const response = await POST(
        postRequest({ issueRef: 'CONSOLE-12', body: 'n'.repeat(length) })
      )

      expect(response.status).toBe(accepted ? 201 : 422)
      expect(mocks.create).toHaveBeenCalledTimes(accepted ? 1 : 0)
    }
  })

  it('rejects non-string bodies without calling the client', async () => {
    // Arrange
    const bodies: unknown[] = [null, 42, true, ['Note'], { text: 'Note' }]

    // Act + Assert
    for (const body of bodies) {
      vi.clearAllMocks()
      const response = await POST(postRequest({ issueRef: 'CONSOLE-12', body }))

      expect(response.status).toBe(422)
      expect(mocks.create).not.toHaveBeenCalled()
    }
  })

  it('rejects non-object envelopes without calling the client', async () => {
    // Arrange
    const envelopes: unknown[] = [null, 42, 'Note', ['CONSOLE-12']]

    // Act + Assert
    for (const envelope of envelopes) {
      vi.clearAllMocks()
      const response = await POST(postRequest(envelope))

      expect(response.status).toBe(422)
      expect(mocks.create).not.toHaveBeenCalled()
    }
  })

  it('never leaks the service client error code to the caller', async () => {
    // Arrange
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'projects/internal-boom', message: 'Boom.' },
    })

    // Act
    const response = await POST(
      postRequest({ issueRef: 'CONSOLE-12', body: 'Note' })
    )

    // Assert
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Boom.' },
    })
  })
})

describe('PATCH /api/comments/[commentId] — boundary matrix', () => {
  it('accepts updated bodies across a deterministic hostile corpus when within limits', async () => {
    // Arrange
    const corpus = sampleCorpus(99, 50)

    // Act + Assert
    for (const raw of corpus) {
      vi.clearAllMocks()
      const response = await PATCH(
        patchRequest({ issueRef: 'CONSOLE-12', body: raw }),
        context
      )
      const trimmed = raw.trim()

      if (trimmed.length === 0 || trimmed.length > 10000) {
        expect(response.status).toBe(422)
        expect(mocks.update).not.toHaveBeenCalled()
      } else {
        expect(response.status).toBe(200)
        expect(mocks.update).toHaveBeenCalledWith(
          'org_1',
          'CONSOLE-12',
          'cmt_1',
          { body: trimmed }
        )
      }
    }
  })

  it('forwards unicode bodies verbatim after trimming', async () => {
    // Arrange
    const body = '  修正计划 🎉 — “quoted” ✓  '

    // Act
    const response = await PATCH(
      patchRequest({ issueRef: 'CONSOLE-12', body }),
      context
    )

    // Assert
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1', {
      body: body.trim(),
    })
  })
})

describe('DELETE /api/comments/[commentId] — query matrix', () => {
  it('accepts references across a deterministic corpus when within limits', async () => {
    // Arrange
    const corpus = sampleCorpus(13, 50)

    // Act + Assert
    for (const raw of corpus) {
      vi.clearAllMocks()
      const url = `http://localhost/api/comments/cmt_1?issueRef=${encodeURIComponent(raw)}`
      const response = await DELETE(
        new NextRequest(url, { method: 'DELETE' }),
        context
      )
      const trimmed = raw.trim()

      if (trimmed.length === 0 || trimmed.length > 120) {
        expect(response.status).toBe(422)
        expect(mocks.remove).not.toHaveBeenCalled()
      } else {
        expect(response.status).toBe(200)
        expect(mocks.remove).toHaveBeenCalledWith('org_1', trimmed, 'cmt_1')
      }
    }
  })

  it('decodes URL-encoded references before deleting', async () => {
    // Arrange
    const url =
      'http://localhost/api/comments/cmt_1?issueRef=%20%20CONSOLE-12%20%20'

    // Act
    const response = await DELETE(
      new NextRequest(url, { method: 'DELETE' }),
      context
    )

    // Assert
    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'CONSOLE-12', 'cmt_1')
  })
})
