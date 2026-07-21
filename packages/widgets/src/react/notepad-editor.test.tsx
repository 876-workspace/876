// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../browser/notes', () => ({
  browserNotes: {
    create: mocks.create,
    update: mocks.update,
    delete: mocks.delete,
  },
}))

vi.mock('./widget-popout', () => ({
  useWidgetPanelLifecycle: () => null,
}))

vi.mock('./notepad-body-editor', () => ({
  NotepadBodyEditor: forwardRef<
    { flush: () => Promise<string> },
    {
      initialBody: string
      onChange: (value: string) => void
      autoFocus?: boolean
      disabled?: boolean
    }
  >(function MockNotepadBodyEditor(
    { initialBody, onChange, autoFocus, disabled },
    ref
  ) {
    const bodyRef = useRef(initialBody)
    useImperativeHandle(ref, () => ({
      flush: async () => bodyRef.current,
    }))

    return (
      <textarea
        aria-label="Note body"
        autoFocus={autoFocus}
        defaultValue={initialBody}
        disabled={disabled}
        onChange={(event) => {
          bodyRef.current = event.target.value
          onChange(event.target.value)
        }}
      />
    )
  }),
}))

import { NotepadEditor } from './notepad-editor'

const entry = {
  id: 'wnote_editor_1',
  title: 'Sprint planning',
  body: 'Capture capacity risks before Friday',
  color: 'yellow' as const,
  pinned: false,
  updated_at: 1_720_000_000,
}

const draftEntry = {
  id: 'draft_local_1',
  title: '',
  body: '',
  color: 'yellow' as const,
  pinned: false,
  updated_at: 1_720_000_000,
}

describe('NotepadEditor', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mocks.update.mockResolvedValue({
      data: {
        object: 'note',
        id: entry.id,
        owner_account_id: 'user_alejandra',
        title: 'Sprint planning',
        body: entry.body,
        color: 'yellow',
        pinned: false,
        created_at: entry.updated_at,
        updated_at: entry.updated_at + 10,
      },
      error: null,
    })
    mocks.create.mockResolvedValue({
      data: {
        object: 'note',
        id: 'wnote_created',
        owner_account_id: 'user_alejandra',
        title: 'Untitled note',
        body: 'hello',
        color: 'yellow',
        pinned: false,
        created_at: entry.updated_at,
        updated_at: entry.updated_at + 10,
      },
      error: null,
    })
    mocks.delete.mockResolvedValue({
      data: { object: 'note', id: entry.id, deleted: true },
      error: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('initial render', () => {
    it('when opened with an existing note, then shows title, body, and saved status', () => {
      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      expect(
        screen.getByRole('region', { name: 'Editing Sprint planning' })
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Note title')).toHaveValue('Sprint planning')
      expect(screen.getByLabelText('Note body')).toHaveValue(entry.body)
      expect(screen.getByLabelText('Note body')).not.toHaveFocus()
      expect(screen.getByRole('status')).toHaveTextContent('Saved')
      expect(
        screen.queryByRole('button', { name: 'Save now' })
      ).not.toBeInTheDocument()
    })

    it('when opened as a draft, then the title is empty with an Untitled note placeholder', () => {
      render(
        <NotepadEditor
          entry={draftEntry}
          onBack={vi.fn()}
          onDeleted={vi.fn()}
        />
      )

      const title = screen.getByLabelText('Note title')
      expect(title).toHaveValue('')
      expect(title).toHaveAttribute('placeholder', 'Untitled note')
      expect(title).not.toHaveFocus()
      expect(screen.getByLabelText('Note body')).toHaveFocus()
      expect(screen.getByRole('status')).toHaveTextContent('Draft')
    })

    it('when the stored title is Untitled note, then the field is empty with a placeholder', () => {
      render(
        <NotepadEditor
          entry={{ ...entry, title: 'Untitled note' }}
          onBack={vi.fn()}
          onDeleted={vi.fn()}
        />
      )

      expect(screen.getByLabelText('Note title')).toHaveValue('')
      expect(screen.getByLabelText('Note title')).toHaveAttribute(
        'placeholder',
        'Untitled note'
      )
    })

    it('when the note has body text, then the footer reports word and character counts', () => {
      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      expect(screen.getByText(/words/i).textContent).toMatch(/\d+ words/)
      expect(screen.getByText(/characters/i).textContent).toMatch(
        /\d+ characters/
      )
    })

    it('does not show a Color label next to the swatches', () => {
      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      expect(
        screen.getByRole('group', { name: 'Note color' })
      ).toBeInTheDocument()
      expect(screen.queryByText(/^Color$/)).not.toBeInTheDocument()
    })
  })

  describe('editing and autosave', () => {
    it('when the title changes, then status becomes unsaved', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      await user.clear(screen.getByLabelText('Note title'))
      await user.type(screen.getByLabelText('Note title'), 'Revised plan')

      expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
    })

    it('when autosave delay elapses after an edit, then the note is patched', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      await user.type(screen.getByLabelText('Note body'), ' — extra risk')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })

      await waitFor(() => {
        expect(mocks.update).toHaveBeenCalledTimes(1)
      })
      expect(mocks.update).toHaveBeenCalledWith(
        entry.id,
        expect.objectContaining({
          body: `${entry.body} — extra risk`,
        })
      )
    })

    it('when title is cleared, then autosave still persists using Untitled note', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mocks.update.mockResolvedValue({
        data: {
          object: 'note',
          id: entry.id,
          owner_account_id: 'user_alejandra',
          title: 'Untitled note',
          body: entry.body,
          color: 'blue',
          pinned: false,
          created_at: entry.updated_at,
          updated_at: entry.updated_at + 20,
        },
        error: null,
      })

      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      await user.clear(screen.getByLabelText('Note title'))
      await user.click(screen.getByRole('button', { name: 'Blue note' }))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })

      await waitFor(() => {
        expect(mocks.update).toHaveBeenCalledWith(
          entry.id,
          expect.objectContaining({
            title: 'Untitled note',
            color: 'blue',
          })
        )
      })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('when the host update fails, then the error alert is shown and the note stays dirty', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mocks.update.mockResolvedValue({
        data: null,
        error: 'Unable to save this note.',
      })

      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      await user.type(screen.getByLabelText('Note title'), '!')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Unable to save this note.'
        )
      })
      expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
    })

    it('keeps the title input enabled while a save is in flight', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      let resolveUpdate: ((value: unknown) => void) | null = null
      mocks.update.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve
          })
      )

      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      await user.type(screen.getByLabelText('Note title'), '!')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Saving…')
      })
      expect(screen.getByLabelText('Note title')).not.toBeDisabled()

      await act(async () => {
        resolveUpdate?.({
          data: {
            object: 'note',
            id: entry.id,
            owner_account_id: 'user_alejandra',
            title: 'Sprint planning!',
            body: entry.body,
            color: 'yellow',
            pinned: false,
            created_at: entry.updated_at,
            updated_at: entry.updated_at + 1,
          },
          error: null,
        })
      })
    })
  })

  describe('draft create', () => {
    it('when a draft gains content, then create is called and onPersisted fires', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onPersisted = vi.fn()
      mocks.create.mockResolvedValue({
        data: {
          object: 'note',
          id: 'wnote_from_draft',
          owner_account_id: 'user_alejandra',
          title: 'Untitled note',
          body: 'first thought',
          color: 'yellow',
          pinned: false,
          created_at: 10,
          updated_at: 10,
        },
        error: null,
      })

      render(
        <NotepadEditor
          entry={draftEntry}
          onBack={vi.fn()}
          onDeleted={vi.fn()}
          onPersisted={onPersisted}
        />
      )

      await user.type(screen.getByLabelText('Note body'), 'first thought')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })

      await waitFor(() => {
        expect(mocks.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Untitled note',
            body: 'first thought',
          })
        )
      })
      await waitFor(() => {
        expect(onPersisted).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'wnote_from_draft' })
        )
      })
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('when an empty draft is abandoned via back, then it goes back and no create is called', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onBack = vi.fn()

      render(
        <NotepadEditor
          entry={draftEntry}
          onBack={onBack}
          onDeleted={vi.fn()}
          onDiscardDraft={vi.fn()}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Back to notes' }))

      // Cleanup of the abandoned draft is owned by onBack (closeEditor);
      // the editor's contract is only that no empty server note is created.
      expect(onBack).toHaveBeenCalledTimes(1)
      expect(mocks.create).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    })
  })

  describe('pin and color', () => {
    it('when the user pins the note, then autosave sends pinned true', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mocks.update.mockResolvedValue({
        data: {
          object: 'note',
          id: entry.id,
          owner_account_id: 'user_alejandra',
          title: entry.title,
          body: entry.body,
          color: 'yellow',
          pinned: true,
          created_at: entry.updated_at,
          updated_at: entry.updated_at + 5,
        },
        error: null,
      })

      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      const pin = screen.getByRole('button', { name: 'Pin note' })
      expect(pin).toHaveAttribute('aria-pressed', 'false')
      await user.click(pin)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })

      await waitFor(() => {
        expect(mocks.update).toHaveBeenCalledWith(
          entry.id,
          expect.objectContaining({ pinned: true })
        )
      })
    })

    it('when the user selects a color swatch, then that color is sent on autosave', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mocks.update.mockResolvedValue({
        data: {
          object: 'note',
          id: entry.id,
          owner_account_id: 'user_alejandra',
          title: entry.title,
          body: entry.body,
          color: 'purple',
          pinned: false,
          created_at: entry.updated_at,
          updated_at: entry.updated_at + 5,
        },
        error: null,
      })

      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={vi.fn()} />
      )

      await user.click(screen.getByRole('button', { name: 'Purple note' }))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })

      await waitFor(() => {
        expect(mocks.update).toHaveBeenCalledWith(
          entry.id,
          expect.objectContaining({ color: 'purple' })
        )
      })
    })
  })

  describe('navigation and delete', () => {
    it('when back is pressed with no dirty state, then onBack fires without an update call', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onBack = vi.fn()

      render(
        <NotepadEditor entry={entry} onBack={onBack} onDeleted={vi.fn()} />
      )

      await user.click(screen.getByRole('button', { name: 'Back to notes' }))

      await waitFor(() => {
        expect(onBack).toHaveBeenCalledTimes(1)
      })
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('when back is pressed while dirty, then onBack fires without waiting for save', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onBack = vi.fn()
      let resolveUpdate: ((value: unknown) => void) | null = null
      mocks.update.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve
          })
      )

      render(
        <NotepadEditor entry={entry} onBack={onBack} onDeleted={vi.fn()} />
      )

      await user.type(screen.getByLabelText('Note title'), '!')
      await user.click(screen.getByRole('button', { name: 'Back to notes' }))

      expect(onBack).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolveUpdate?.({
          data: {
            object: 'note',
            id: entry.id,
            owner_account_id: 'user_alejandra',
            title: 'Sprint planning!',
            body: entry.body,
            color: 'yellow',
            pinned: false,
            created_at: entry.updated_at,
            updated_at: entry.updated_at + 1,
          },
          error: null,
        })
      })
    })

    it('when the user confirms delete, then the note is deleted and onDeleted runs', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onDeleted = vi.fn()

      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={onDeleted} />
      )

      await user.click(screen.getByRole('button', { name: 'Delete note' }))
      expect(
        screen.getByRole('heading', { name: 'Delete this note?' })
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Delete note' }))

      await waitFor(() => {
        expect(mocks.delete).toHaveBeenCalledWith(entry.id)
      })
      await waitFor(() => {
        expect(onDeleted).toHaveBeenCalledTimes(1)
      })
    })

    it('when delete fails, then an alert is shown and onDeleted is not called', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onDeleted = vi.fn()
      mocks.delete.mockResolvedValue({
        data: null,
        error: 'Notepad entry not found.',
      })

      render(
        <NotepadEditor entry={entry} onBack={vi.fn()} onDeleted={onDeleted} />
      )

      await user.click(screen.getByRole('button', { name: 'Delete note' }))
      await user.click(screen.getByRole('button', { name: 'Delete note' }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Notepad entry not found.'
        )
      })
      expect(onDeleted).not.toHaveBeenCalled()
    })
  })
})
