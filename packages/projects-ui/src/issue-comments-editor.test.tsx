// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Comment } from '@876/projects/contracts'
import { describe, expect, it, vi } from 'vitest'

import { IssueComments } from './issue-comments'

function makeComment(overrides?: Partial<Comment>): Comment {
  return {
    object: 'projects.comment',
    id: 'comment_1',
    tenantId: 'tenant_1',
    issueId: 'issue_1',
    authorUserId: 'user_1',
    body: 'Initial comment',
    createdAt: 1710000000,
    updatedAt: 1710000000,
    ...overrides,
  }
}

const createSuccess = vi.fn(async (body: string) => ({
  data: makeComment({ id: 'comment_created', body }),
  error: null,
}))

describe('IssueComments editor composition', () => {
  it('renders the new-comment composer as a labelled Markdown surface with its action', () => {
    render(<IssueComments comments={[]} onCreateComment={createSuccess} />)

    const composer = screen.getByRole('region', { name: 'Add a comment' })

    expect(
      within(composer).getByRole('group', { name: 'Markdown editor' })
    ).toBeInTheDocument()
    expect(within(composer).getByText('Markdown supported')).toBeInTheDocument()
    expect(
      within(composer).getByRole('button', { name: 'Comment' })
    ).toBeDisabled()
  })

  it('keeps a create draft in the redesigned composer when the service rejects it', async () => {
    const onCreateComment = vi.fn(async () => ({
      data: null,
      error: {
        code: 'projects/comment-create-failed',
        message: 'Comment service unavailable.',
      },
    }))
    render(<IssueComments comments={[]} onCreateComment={onCreateComment} />)
    const composer = screen.getByRole('region', { name: 'Add a comment' })
    const textbox = within(composer).getByRole('textbox')

    fireEvent.change(textbox, { target: { value: 'Keep this draft.' } })
    fireEvent.click(within(composer).getByRole('button', { name: 'Comment' }))

    expect(await screen.findByText('Comment not added')).toBeInTheDocument()
    expect(textbox).toHaveValue('Keep this draft.')
    expect(
      within(composer).getByRole('group', { name: 'Markdown editor' })
    ).toBeInTheDocument()
  })

  it('uses the same Markdown editor for comment edits and preserves the draft after an update error', async () => {
    const comment = makeComment()
    const onUpdateComment = vi.fn(async () => ({
      data: null,
      error: {
        code: 'projects/comment-update-failed',
        message: 'Comment update unavailable.',
      },
    }))
    render(
      <IssueComments
        comments={[comment]}
        currentUserId="user_1"
        onCreateComment={createSuccess}
        onUpdateComment={onUpdateComment}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Comment actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const editor = screen.getByRole('region', { name: 'Edit comment' })
    const textbox = within(editor).getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'Edited draft' } })
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Comment not updated')).toBeInTheDocument()
    expect(textbox).toHaveValue('Edited draft')
    expect(
      within(editor).getByRole('group', { name: 'Markdown editor' })
    ).toBeInTheDocument()
  })
})
