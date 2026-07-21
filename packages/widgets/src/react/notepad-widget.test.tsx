// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  beforeDeactivateHandlers: [] as Array<
    () => boolean | void | Promise<boolean | void>
  >,
}))

vi.mock('../browser/notes', () => ({
  browserNotes: {
    list: mocks.list,
    create: mocks.create,
    update: mocks.update,
    delete: mocks.delete,
  },
}))

vi.mock('./widget-popout', () => ({
  useWidgetPanelLifecycle: () => ({
    registerBeforeDeactivate: (
      handler: () => boolean | void | Promise<boolean | void>
    ) => {
      mocks.beforeDeactivateHandlers.push(handler)
      return () => {
        mocks.beforeDeactivateHandlers = mocks.beforeDeactivateHandlers.filter(
          (item) => item !== handler
        )
      }
    },
  }),
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

import { NotepadWidgetPanel } from './notepad-widget'

const entries = [
  {
    object: 'note' as const,
    id: 'wnote_first',
    owner_account_id: 'user_owner',
    title: 'First note',
    body: 'Plan the launch checklist',
    color: 'yellow' as const,
    pinned: false,
    created_at: 1,
    updated_at: 2,
  },
  {
    object: 'note' as const,
    id: 'wnote_second',
    owner_account_id: 'user_owner',
    title: 'Second note',
    body: 'Remember the customer follow-up',
    color: 'pink' as const,
    pinned: true,
    created_at: 3,
    updated_at: 4,
  },
]

function listResponse(data = entries, hasMore = false) {
  return {
    data: {
      object: 'list' as const,
      data,
      has_more: hasMore,
      url: '/v1/notes',
      total_count: null,
    },
    error: null,
  }
}

describe('NotepadWidgetPanel', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.beforeDeactivateHandlers = []
    mocks.list.mockResolvedValue(listResponse())
    mocks.create.mockResolvedValue({
      data: {
        object: 'note',
        id: 'wnote_new',
        owner_account_id: 'user_owner',
        title: 'Untitled note',
        body: '',
        color: 'yellow',
        pinned: false,
        created_at: 10,
        updated_at: 10,
      },
      error: null,
    })
    mocks.update.mockResolvedValue({
      data: entries[0],
      error: null,
    })
    mocks.delete.mockResolvedValue({
      data: { object: 'note', id: 'wnote_first', deleted: true },
      error: null,
    })
  })

  describe('loading notes', () => {
    it('when the host list succeeds, then notes are rendered in the sticky grid', async () => {
      render(<NotepadWidgetPanel />)

      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
      })
      expect(screen.getByText('Second note')).toBeInTheDocument()
      expect(mocks.list).toHaveBeenCalledWith({
        limit: 50,
        starting_after: undefined,
      })
    })

    it('when the first page fails, then an error panel offers Try again', async () => {
      const user = userEvent.setup()
      mocks.list
        .mockResolvedValueOnce({
          data: null,
          error: 'Unable to reach the widget service.',
        })
        .mockResolvedValueOnce(listResponse())

      render(<NotepadWidgetPanel />)

      await waitFor(() => {
        expect(screen.getByText('Unable to load notes')).toBeInTheDocument()
      })
      expect(
        screen.getByText('Unable to reach the widget service.')
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Try again' }))

      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
      })
      expect(mocks.list).toHaveBeenCalledTimes(2)
    })

    it('when the account has no notes, then the empty state is shown', async () => {
      mocks.list.mockResolvedValue(listResponse([]))

      render(<NotepadWidgetPanel />)

      await waitFor(() => {
        expect(screen.getByText('No notes yet')).toBeInTheDocument()
      })
    })
  })

  describe('creating notes', () => {
    it('when the user creates a note, then the editor opens immediately without awaiting create', async () => {
      const user = userEvent.setup()
      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(screen.getByText('First note')).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: /new note/i }))

      expect(screen.getByLabelText('Note title')).toBeInTheDocument()
      expect(screen.getByLabelText('Note title')).toHaveValue('')
      expect(screen.getByLabelText('Note title')).toHaveAttribute(
        'placeholder',
        'Untitled note'
      )
      expect(screen.getByLabelText('Note body')).toHaveFocus()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('when an empty draft is abandoned, then no create call is made and the list returns', async () => {
      const user = userEvent.setup()
      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(screen.getByText('First note')).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: /new note/i }))
      expect(screen.getByLabelText('Note title')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Back to notes' }))

      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
      })
      expect(mocks.create).not.toHaveBeenCalled()
    })
  })

  describe('opening and paging', () => {
    it('when the user opens a note from the grid, then the editor loads that title', async () => {
      const user = userEvent.setup()
      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(screen.getByText('First note')).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: 'Open First note' }))

      expect(screen.getByLabelText('Note title')).toHaveValue('First note')
      expect(
        screen.getByRole('region', { name: 'Editing First note' })
      ).toBeInTheDocument()
    })

    it('when more pages are available, then Load older notes requests the next cursor', async () => {
      const user = userEvent.setup()
      const pageOne = [
        {
          ...entries[0],
          id: 'wnote_page_one_a',
          title: 'Page one A',
          updated_at: 30,
        },
        {
          ...entries[1],
          id: 'wnote_page_one_b',
          title: 'Page one B',
          updated_at: 20,
        },
      ]
      const pageTwo = [
        {
          ...entries[0],
          id: 'wnote_page_two',
          title: 'Page two note',
          updated_at: 10,
        },
      ]
      mocks.list
        .mockResolvedValueOnce(listResponse(pageOne, true))
        .mockResolvedValueOnce(listResponse(pageTwo, false))

      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(screen.getByText('Page one A')).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: 'Load older notes' }))

      await waitFor(() => {
        expect(mocks.list).toHaveBeenCalledWith({
          limit: 50,
          starting_after: 'wnote_page_one_b',
        })
      })
      await waitFor(() => {
        expect(screen.getByText('Page two note')).toBeInTheDocument()
      })
    })
  })

  describe('panel deactivate home reset', () => {
    it('when the panel deactivates while a note is open, then the next view is the home grid', async () => {
      const user = userEvent.setup()
      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(screen.getByText('First note')).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: 'Open First note' }))
      expect(screen.getByLabelText('Note title')).toHaveValue('First note')

      await act(async () => {
        await Promise.all(
          mocks.beforeDeactivateHandlers.map(async (handler) => handler())
        )
      })

      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
      })
      expect(screen.queryByLabelText('Note title')).not.toBeInTheDocument()
    })
  })

  describe('refresh edge cases', () => {
    it('when returning from the editor, then notes stay visible without first-page skeletons', async () => {
      const user = userEvent.setup()
      let resolveRefresh: ((value: unknown) => void) | null = null

      mocks.list.mockResolvedValueOnce(listResponse()).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve
          })
      )

      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(screen.getByText('First note')).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: 'Open First note' }))
      await user.click(screen.getByRole('button', { name: 'Back to notes' }))

      // List is refreshing in the background — cached notes must stay, no skeleton stack.
      expect(screen.getByText('First note')).toBeInTheDocument()
      expect(screen.getByText('Second note')).toBeInTheDocument()
      expect(
        screen.queryByRole('status', { name: 'Loading notes' })
      ).not.toBeInTheDocument()

      await act(async () => {
        resolveRefresh?.(listResponse())
      })

      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
      })
      expect(
        screen.queryByRole('status', { name: 'Loading notes' })
      ).not.toBeInTheDocument()
    })

    it('when an older list response resolves after a newer refresh started, then stale data is ignored', async () => {
      const user = userEvent.setup()
      const staleList = listResponse([
        {
          ...entries[0],
          id: 'wnote_stale',
          title: 'Stale page',
        },
      ])
      const freshList = listResponse([
        {
          ...entries[0],
          id: 'wnote_fresh',
          title: 'Fresh page',
        },
      ])

      let resolveSecond: ((value: unknown) => void) | null = null
      let listCall = 0
      mocks.list.mockImplementation(() => {
        listCall += 1
        if (listCall === 1) return Promise.resolve(listResponse())
        if (listCall === 2)
          return new Promise((resolve) => {
            resolveSecond = resolve
          })
        return Promise.resolve(freshList)
      })

      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(screen.getByText('First note')).toBeInTheDocument()
      )

      // Start refresh #2 (pending), then refresh #3 (becomes current generation).
      await user.click(screen.getByRole('button', { name: 'Open First note' }))
      await user.click(screen.getByRole('button', { name: 'Back to notes' }))
      await waitFor(() => expect(listCall).toBe(2))

      await user.click(screen.getByRole('button', { name: 'Open First note' }))
      await user.click(screen.getByRole('button', { name: 'Back to notes' }))
      await waitFor(() => expect(listCall).toBe(3))

      // Generation 3 resolves quickly with Fresh page. Generation 2's late
      // response must not overwrite it with Stale page.
      await waitFor(() => {
        expect(screen.getByText('Fresh page')).toBeInTheDocument()
      })

      await act(async () => {
        resolveSecond?.(staleList)
      })

      expect(screen.getByText('Fresh page')).toBeInTheDocument()
      expect(screen.queryByText('Stale page')).not.toBeInTheDocument()
    })

    it('when opening a note with Untitled note title, then the title field uses a placeholder', async () => {
      const user = userEvent.setup()
      mocks.list.mockResolvedValue(
        listResponse([
          {
            ...entries[0],
            id: 'wnote_untitled',
            title: 'Untitled note',
            body: 'body text',
          },
        ])
      )

      render(<NotepadWidgetPanel />)
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Open Untitled note' })
        ).toBeInTheDocument()
      )

      await user.click(
        screen.getByRole('button', { name: 'Open Untitled note' })
      )

      expect(screen.getByLabelText('Note title')).toHaveValue('')
      expect(screen.getByLabelText('Note title')).toHaveAttribute(
        'placeholder',
        'Untitled note'
      )
    })
  })
})
