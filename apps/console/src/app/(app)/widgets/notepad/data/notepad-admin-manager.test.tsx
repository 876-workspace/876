// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listAll: vi.fn(),
  adminUpdate: vi.fn(),
  adminDelete: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@876/widgets/browser', () => ({
  browserNotes: {
    listAll: mocks.listAll,
    adminUpdate: mocks.adminUpdate,
    adminDelete: mocks.adminDelete,
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

import { NotepadAdminManager } from './notepad-admin-manager'

const note = {
  object: 'note' as const,
  id: 'wnote_1',
  owner_account_id: 'user_1',
  title: 'Hello',
  body: 'World',
  color: 'yellow' as const,
  pinned: false,
  created_at: 1,
  updated_at: 2,
}

function listResponse(data = [note], hasMore = false) {
  return {
    data: {
      object: 'list' as const,
      data,
      has_more: hasMore,
      url: '/v1/admin/notes',
      total_count: null,
    },
    error: null,
  }
}

describe('NotepadAdminManager', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.listAll.mockResolvedValue(listResponse())
    mocks.adminUpdate.mockResolvedValue({ data: note, error: null })
    mocks.adminDelete.mockResolvedValue({
      data: { object: 'note', id: note.id, deleted: true },
      error: null,
    })
  })

  describe('listing', () => {
    it('when mounted, then lists notes from the host admin API', async () => {
      render(<NotepadAdminManager />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })
      expect(mocks.listAll).toHaveBeenCalledWith({
        owner_account_id: undefined,
        limit: 50,
        starting_after: undefined,
      })
    })

    it('when the admin list fails, then a toast error is shown', async () => {
      mocks.listAll.mockResolvedValue({
        data: null,
        error: 'Unable to reach the widget service.',
      })

      render(<NotepadAdminManager />)

      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalledWith(
          'Unable to reach the widget service.'
        )
      })
    })

    it('when there are no notes, then shows the empty table message', async () => {
      mocks.listAll.mockResolvedValue(listResponse([]))

      render(<NotepadAdminManager />)

      await waitFor(() => {
        expect(screen.getByText('No notes found.')).toBeInTheDocument()
      })
    })
  })

  describe('filtering', () => {
    it('when filtering by owner account id, then reloads with that owner', async () => {
      const user = userEvent.setup()
      render(<NotepadAdminManager />)
      await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

      await user.type(screen.getByLabelText('876 account ID'), 'user_target')
      await user.click(screen.getByRole('button', { name: 'Filter' }))

      await waitFor(() => {
        expect(mocks.listAll).toHaveBeenLastCalledWith(
          expect.objectContaining({ owner_account_id: 'user_target' })
        )
      })
    })

    it('when clearing the owner filter, then reloads without an owner constraint', async () => {
      const user = userEvent.setup()
      render(<NotepadAdminManager />)
      await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

      await user.type(screen.getByLabelText('876 account ID'), 'user_target')
      await user.click(screen.getByRole('button', { name: 'Filter' }))
      await waitFor(() =>
        expect(mocks.listAll).toHaveBeenLastCalledWith(
          expect.objectContaining({ owner_account_id: 'user_target' })
        )
      )

      await user.click(screen.getByRole('button', { name: 'All accounts' }))

      await waitFor(() => {
        expect(mocks.listAll).toHaveBeenLastCalledWith(
          expect.objectContaining({ owner_account_id: undefined })
        )
      })
    })
  })

  describe('edit and delete', () => {
    it('when saving an edited note, then calls adminUpdate and reloads', async () => {
      const user = userEvent.setup()
      render(<NotepadAdminManager />)
      await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Edit' }))
      expect(screen.getByText('Edit note')).toBeInTheDocument()

      const titleInput = screen.getByDisplayValue('Hello')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Hello')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mocks.adminUpdate).toHaveBeenCalledWith('wnote_1', {
          title: 'Updated Hello',
          body: 'World',
        })
      })
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Notepad entry updated.')
    })

    it('when adminUpdate fails, then shows a toast error and keeps the editor open', async () => {
      const user = userEvent.setup()
      mocks.adminUpdate.mockResolvedValue({
        data: null,
        error: 'Notepad entry not found.',
      })

      render(<NotepadAdminManager />)
      await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Edit' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalledWith(
          'Notepad entry not found.'
        )
      })
      expect(screen.getByText('Edit note')).toBeInTheDocument()
    })

    it('when delete is confirmed, then calls adminDelete and reloads', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<NotepadAdminManager />)
      await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(mocks.adminDelete).toHaveBeenCalledWith('wnote_1')
      })
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Notepad entry deleted.')
      expect(window.confirm).toHaveBeenCalledWith(
        'Delete this note permanently?'
      )
    })

    it('when delete is cancelled, then does not call adminDelete', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(<NotepadAdminManager />)
      await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(mocks.adminDelete).not.toHaveBeenCalled()
    })
  })

  describe('pagination', () => {
    it('when has_more is true, then Load more requests the next cursor', async () => {
      const user = userEvent.setup()
      mocks.listAll
        .mockResolvedValueOnce(listResponse([note], true))
        .mockResolvedValueOnce(
          listResponse(
            [
              {
                ...note,
                id: 'wnote_2',
                title: 'Second page note',
              },
            ],
            false
          )
        )

      render(<NotepadAdminManager />)
      await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Load more' }))

      await waitFor(() => {
        expect(screen.getByText('Second page note')).toBeInTheDocument()
      })
      expect(mocks.listAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ starting_after: 'wnote_1' })
      )
    })
  })
})
