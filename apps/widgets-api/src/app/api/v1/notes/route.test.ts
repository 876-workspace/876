import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireWidgetsService: vi.fn(),
  listNotes: vi.fn(),
  createNote: vi.fn(),
}))

vi.mock('@/lib/auth/service-key', () => ({
  requireWidgetsService: mocks.requireWidgetsService,
}))

vi.mock('@/lib/service', () => ({
  service: {
    notes: {
      listNotes: mocks.listNotes,
      createNote: mocks.createNote,
    },
  },
}))

import { GET, POST } from './route'

describe('Widgets API /api/v1/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireWidgetsService.mockReturnValue({
      actorUserId: 'user_alejandra',
      isAdmin: false,
      response: null,
    })
  })

  describe('GET', () => {
    it('when authorized, then lists notes for the actor user id', async () => {
      mocks.listNotes.mockResolvedValue({
        data: {
          object: 'list',
          data: [],
          has_more: false,
          url: '/v1/notes',
          total_count: null,
        },
        error: null,
      })

      const response = await GET(
        new Request(
          'http://widgets.test/api/v1/notes?limit=10&starting_after=wnote_c'
        )
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.object).toBe('list')
      expect(mocks.listNotes).toHaveBeenCalledWith({
        ownerAccountId: 'user_alejandra',
        limit: 10,
        startingAfter: 'wnote_c',
      })
    })

    it('when unauthorized, then returns the auth response', async () => {
      mocks.requireWidgetsService.mockReturnValue({
        actorUserId: null,
        isAdmin: false,
        response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
      })

      const response = await GET(
        new Request('http://widgets.test/api/v1/notes')
      )

      expect(response.status).toBe(401)
      expect(mocks.listNotes).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    it('when payload is valid, then creates a note for the actor', async () => {
      mocks.createNote.mockResolvedValue({
        data: {
          object: 'note',
          id: 'wnote_1',
          owner_account_id: 'user_alejandra',
          title: 'Hello',
          body: 'World',
          color: 'pink',
          pinned: false,
          created_at: 1,
          updated_at: 1,
        },
        error: null,
      })

      const response = await POST(
        new Request('http://widgets.test/api/v1/notes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: 'Hello',
            body: 'World',
            color: 'pink',
          }),
        })
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.title).toBe('Hello')
      expect(mocks.createNote).toHaveBeenCalledWith({
        ownerAccountId: 'user_alejandra',
        title: 'Hello',
        body: 'World',
        color: 'pink',
        pinned: undefined,
      })
    })

    it('when color is invalid, then rejects before create', async () => {
      const response = await POST(
        new Request('http://widgets.test/api/v1/notes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: 'Hello',
            body: 'World',
            color: 'orange',
          }),
        })
      )
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error?.code ?? body.error).toBeTruthy()
      expect(mocks.createNote).not.toHaveBeenCalled()
    })

    it('when JSON is invalid, then returns 400', async () => {
      const response = await POST(
        new Request('http://widgets.test/api/v1/notes', {
          method: 'POST',
          body: '{bad',
        })
      )

      expect(response.status).toBe(400)
      expect(mocks.createNote).not.toHaveBeenCalled()
    })
  })
})
