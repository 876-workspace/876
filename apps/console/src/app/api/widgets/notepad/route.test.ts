import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireNotepadMember: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/widgets-auth', () => ({
  requireNotepadMember: mocks.requireNotepadMember,
}))

vi.mock('@/lib/widgets', () => ({
  $widgets: {
    notes: {
      list: mocks.list,
      create: mocks.create,
    },
  },
}))

import { GET, POST } from './route'

const sampleNote = {
  object: 'note',
  id: 'wnote_1',
  owner_account_id: 'user_alejandra',
  title: 'Dock polish',
  body: 'Ship sticky notes UI tests',
  color: 'yellow',
  pinned: false,
  created_at: 10,
  updated_at: 20,
}

describe('Console notepad member collection route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireNotepadMember.mockResolvedValue({
      userId: 'user_alejandra',
      response: null,
    })
  })

  describe('GET', () => {
    it('when the session is authorized, then lists notes for that actor', async () => {
      mocks.list.mockResolvedValue({
        data: {
          object: 'list',
          data: [sampleNote],
          has_more: false,
          url: '/v1/notes',
          total_count: null,
        },
        error: null,
      })

      const response = await GET(
        new Request(
          'http://console.test/api/widgets/notepad?limit=25&starting_after=wnote_cursor'
        )
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.data).toHaveLength(1)
      expect(mocks.list).toHaveBeenCalledWith(
        { userId: 'user_alejandra' },
        { limit: 25, starting_after: 'wnote_cursor' }
      )
    })

    it('when the member is unauthorized, then returns the auth response and does not list', async () => {
      mocks.requireNotepadMember.mockResolvedValue({
        userId: null,
        response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
      })

      const response = await GET(
        new Request('http://console.test/api/widgets/notepad')
      )

      expect(response.status).toBe(401)
      expect(mocks.list).not.toHaveBeenCalled()
    })

    it('when notepad access is disabled, then returns 403 and does not list', async () => {
      mocks.requireNotepadMember.mockResolvedValue({
        userId: null,
        response: Response.json(
          { error: 'Access to the notepad widget is disabled.' },
          { status: 403 }
        ),
      })

      const response = await GET(
        new Request('http://console.test/api/widgets/notepad')
      )

      expect(response.status).toBe(403)
      expect(mocks.list).not.toHaveBeenCalled()
    })

    it('when the widgets client fails, then returns a 502 with the error code', async () => {
      mocks.list.mockResolvedValue({
        data: null,
        error: {
          code: 'widgets/network-error',
          message: 'Unable to reach the Widgets API.',
        },
      })

      const response = await GET(
        new Request('http://console.test/api/widgets/notepad')
      )
      const body = await response.json()

      expect(response.status).toBe(502)
      expect(body.error?.code ?? body.error).toBeTruthy()
    })
  })

  describe('POST', () => {
    it('when the body is valid, then creates a note for the actor and returns 201', async () => {
      mocks.create.mockResolvedValue({ data: sampleNote, error: null })

      const response = await POST(
        new Request('http://console.test/api/widgets/notepad', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: 'Dock polish',
            body: 'Ship sticky notes UI tests',
            color: 'pink',
            pinned: true,
          }),
        })
      )
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.data.id).toBe('wnote_1')
      expect(mocks.create).toHaveBeenCalledWith(
        { userId: 'user_alejandra' },
        {
          title: 'Dock polish',
          body: 'Ship sticky notes UI tests',
          color: 'pink',
          pinned: true,
        }
      )
    })

    it('when the JSON body is invalid, then returns 400 and does not create', async () => {
      const response = await POST(
        new Request('http://console.test/api/widgets/notepad', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{not-json',
        })
      )

      expect(response.status).toBe(400)
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('when required fields are missing, then still forwards empty strings to the service boundary', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: {
          code: 'widgets/invalid-title',
          message: 'Notepad titles must be between 1 and 160 characters.',
        },
      })

      const response = await POST(
        new Request('http://console.test/api/widgets/notepad', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
      )

      expect(mocks.create).toHaveBeenCalledWith(
        { userId: 'user_alejandra' },
        {
          title: '',
          body: '',
          color: undefined,
          pinned: undefined,
        }
      )
      expect(response.status).toBe(502)
    })
  })
})
