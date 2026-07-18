// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { serializeNoteBody } from './notepad-editor-data'
import { NotepadNotesView } from './notepad-notes-view'

const entries = [
  {
    id: 'wnote_pinned',
    title: 'Pinned launch checklist',
    body: serializeNoteBody({
      blocks: [
        { type: 'paragraph', data: { text: 'Confirm Cloudflare deploy' } },
      ],
    }),
    color: 'pink' as const,
    pinned: true,
    updated_at: 200,
  },
  {
    id: 'wnote_recent',
    title: 'Customer follow-up',
    body: serializeNoteBody({
      blocks: [
        { type: 'paragraph', data: { text: 'Email Alejandra about billing' } },
      ],
    }),
    color: 'yellow' as const,
    pinned: false,
    updated_at: 400,
  },
  {
    id: 'wnote_older',
    title: 'Archived brainstorm',
    body: 'plain legacy body about search ranking',
    color: 'blue' as const,
    pinned: false,
    updated_at: 100,
  },
]

describe('NotepadNotesView', () => {
  afterEach(() => {
    cleanup()
  })

  describe('happy path rendering', () => {
    it('when notes are loaded, then shows the sticky notes landmark and New note action', () => {
      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(
        screen.getByRole('region', { name: 'Sticky notes' })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'New note' })).toBeEnabled()
    })

    it('when notes include pinned entries, then pinned notes render before unpinned ones', () => {
      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      const cards = screen.getAllByRole('button', { name: /Open / })
      expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
        'Open Pinned launch checklist',
        'Open Customer follow-up',
        'Open Archived brainstorm',
      ])
      expect(within(cards[0]!).getByLabelText('Pinned')).toBeInTheDocument()
    })

    it('when a note uses Editor.js JSON, then the card preview shows plain text without tags', () => {
      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(screen.getByText('Confirm Cloudflare deploy')).toBeInTheDocument()
      expect(
        screen.getByText('Email Alejandra about billing')
      ).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('when the user clicks New note, then onCreate is invoked once', async () => {
      const user = userEvent.setup()
      const onCreate = vi.fn()

      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={onCreate}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      await user.click(screen.getByRole('button', { name: 'New note' }))

      expect(onCreate).toHaveBeenCalledTimes(1)
    })

    it('when the user opens a card, then onOpen receives that note id', async () => {
      const user = userEvent.setup()
      const onOpen = vi.fn()

      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={onOpen}
          onLoadMore={vi.fn()}
        />
      )

      await user.click(
        screen.getByRole('button', { name: 'Open Customer follow-up' })
      )

      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(onOpen).toHaveBeenCalledWith('wnote_recent')
    })
  })

  describe('search', () => {
    it('when the user searches by title, then only matching notes remain', async () => {
      const user = userEvent.setup()

      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      await user.type(screen.getByLabelText('Search notes'), 'Customer')

      expect(
        screen.getByRole('button', { name: 'Open Customer follow-up' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Open Pinned launch checklist' })
      ).not.toBeInTheDocument()
    })

    it('when the user searches by body text, then notes matching the body are shown', async () => {
      const user = userEvent.setup()

      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      await user.type(screen.getByLabelText('Search notes'), 'search ranking')

      expect(
        screen.getByRole('button', { name: 'Open Archived brainstorm' })
      ).toBeInTheDocument()
    })

    it('when no notes match the query, then shows the empty search state and clear action', async () => {
      const user = userEvent.setup()

      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      await user.type(screen.getByLabelText('Search notes'), 'zzzz-no-match')

      expect(screen.getByText('No matching notes')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Clear search' }))

      expect(screen.getByLabelText('Search notes')).toHaveValue('')
    })

    it('when the clear icon is pressed, then the search field is emptied', async () => {
      const user = userEvent.setup()

      render(
        <NotepadNotesView
          entries={entries}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      await user.type(screen.getByLabelText('Search notes'), 'Customer')
      await user.click(
        screen.getByRole('button', { name: 'Clear note search' })
      )

      expect(screen.getByLabelText('Search notes')).toHaveValue('')
    })
  })

  describe('empty and loading states', () => {
    it('when there are no notes yet, then shows the empty state CTA', async () => {
      const user = userEvent.setup()
      const onCreate = vi.fn()

      render(
        <NotepadNotesView
          entries={[]}
          status="Exhausted"
          onCreate={onCreate}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(screen.getByText('No notes yet')).toBeInTheDocument()
      // Header + empty-state both expose "New note"; the empty-state CTA sits after the copy.
      const newNoteButtons = screen.getAllByRole('button', { name: 'New note' })
      expect(newNoteButtons.length).toBeGreaterThanOrEqual(2)
      await user.click(newNoteButtons[newNoteButtons.length - 1]!)
      expect(onCreate).toHaveBeenCalledTimes(1)
    })

    it('when status is LoadingFirstPage with no entries, then only the skeleton region is shown', () => {
      render(
        <NotepadNotesView
          entries={[]}
          status="LoadingFirstPage"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(
        screen.getByRole('status', { name: 'Loading notes' })
      ).toBeInTheDocument()
      expect(screen.queryByText('No notes yet')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Open / })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'New note' })).toBeDisabled()
    })

    it('when status is LoadingFirstPage but entries already exist, then shows notes without skeletons', () => {
      render(
        <NotepadNotesView
          entries={entries}
          status="LoadingFirstPage"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(
        screen.queryByRole('status', { name: 'Loading notes' })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Open Customer follow-up' })
      ).toBeInTheDocument()
      expect(screen.queryByText('No notes yet')).not.toBeInTheDocument()
      expect(screen.queryByText('No matching notes')).not.toBeInTheDocument()
    })

    it('when status is LoadingMore, then keeps the note grid and does not show first-page skeletons', () => {
      render(
        <NotepadNotesView
          entries={entries}
          status="LoadingMore"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(
        screen.queryByRole('status', { name: 'Loading notes' })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Open Customer follow-up' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Loading notes/i })
      ).toBeDisabled()
    })

    it('when an empty title is stored, then the card shows Untitled note', () => {
      render(
        <NotepadNotesView
          entries={[
            {
              id: 'wnote_blank_title',
              title: '',
              body: 'just a body',
              color: 'yellow',
              pinned: false,
              updated_at: 50,
            },
          ]}
          status="Exhausted"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Open Untitled note' })
      ).toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('when more notes can be loaded, then Load older notes calls onLoadMore', async () => {
      const user = userEvent.setup()
      const onLoadMore = vi.fn()

      render(
        <NotepadNotesView
          entries={entries}
          status="CanLoadMore"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={onLoadMore}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Load older notes' }))

      expect(onLoadMore).toHaveBeenCalledTimes(1)
    })

    it('when status is LoadingMore, then the load control is disabled', () => {
      render(
        <NotepadNotesView
          entries={entries}
          status="LoadingMore"
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          onLoadMore={vi.fn()}
        />
      )

      expect(
        screen.getByRole('button', { name: /Loading notes/i })
      ).toBeDisabled()
    })
  })
})
