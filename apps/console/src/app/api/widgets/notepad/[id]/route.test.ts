import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireNotepadMember: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/widgets-auth', () => ({
  requireNotepadMember: mocks.requireNotepadMember,
}))

vi.mock('@/lib/widgets', () => ({
  $widgets: {
    notes: {
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}))

import { DELETE, PATCH } from './route'

const context = { params: Promise.resolve({ id: 'wnote_42' }) }

const sampleNote = {
  object: 'note',
  id: 'wnote_42',
  owner_account_id: 'user_alejandra',
  title: 'Updated title',
  body: 'Updated body',
  color: 'blue',
  pinned: true,
  created_at: 10,
  updated_at: 30,
}

describe('Console notepad member item route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireNotepadMember.mockResolvedValue({
      userId: 'user_alejandra',
      response: null,
    })
  })

  describe('PATCH', () => {
    it('when fields are provided, then updates the note for the actor', async () => {
      mocks.update.mockResolvedValue({ data: sampleNote, error: null })

      const response = await PATCH(
        new Request('http://console.test/api/widgets/notepad/wnote_42', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: 'Updated title',
            body: 'Updated body',
            color: 'blue',
            pinned: true,
          }),
        }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.title).toBe('Updated title')
      expect(mocks.update).toHaveBeenCalledWith(
        { userId: 'user_alejandra' },
        'wnote_42',
        {
          title: 'Updated title',
          body: 'Updated body',
          color: 'blue',
          pinned: true,
        }
      )
    })

    it('when JSON is invalid, then returns 400 and does not update', async () => {
      const response = await PATCH(
        new Request('http://console.test/api/widgets/notepad/wnote_42', {
          method: 'PATCH',
          body: 'not-json',
        }),
        context
      )

      expect(response.status).toBe(400)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('when the note is not found, then returns 404', async () => {
      mocks.update.mockResolvedValue({
        data: null,
        error: {
          code: 'widgets/note-not-found',
          message: 'Notepad entry not found.',
        },
      })

      const response = await PATCH(
        new Request('http://console.test/api/widgets/notepad/wnote_42', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: 'Missing' }),
        }),
        context
      )

      expect(response.status).toBe(404)
    })

    it('when unauthorized, then does not call update', async () => {
      mocks.requireNotepadMember.mockResolvedValue({
        userId: null,
        response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
      })

      const response = await PATCH(
        new Request('http://console.test/api/widgets/notepad/wnote_42', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: 'Nope' }),
        }),
        context
      )

      expect(response.status).toBe(401)
      expect(mocks.update).not.toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('when authorized, then deletes the note and returns a tombstone', async () => {
      mocks.delete.mockResolvedValue({
        data: { object: 'note', id: 'wnote_42', deleted: true },
        error: null,
      })

      const response = await DELETE(
        new Request('http://console.test/api/widgets/notepad/wnote_42', {
          method: 'DELETE',
        }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toEqual({
        object: 'note',
        id: 'wnote_42',
        deleted: true,
      })
      expect(mocks.delete).toHaveBeenCalledWith(
        { userId: 'user_alejandra' },
        'wnote_42'
      )
    })

    it('when the note is not found, then returns 404', async () => {
      mocks.delete.mockResolvedValue({
        data: null,
        error: {
          code: 'widgets/note-not-found',
          message: 'Notepad entry not found.',
        },
      })

      const response = await DELETE(
        new Request('http://console.test/api/widgets/notepad/wnote_42', {
          method: 'DELETE',
        }),
        context
      )

      expect(response.status).toBe(404)
    })
  })
})
