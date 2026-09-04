// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Comment } from '@876/projects/contracts'
import { describe, expect, it, vi } from 'vitest'

import { IssueComments } from './issue-comments'

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    object: 'projects.comment',
    id: 'comment_1',
    tenantId: 'tenant_1',
    issueId: 'issue_1',
    authorUserId: 'user_1',
    body: 'Initial comment',
    createdAt: 1787767200,
    updatedAt: 1787767200,
    ...overrides,
  }
}

const createComment = vi.fn(async () => ({ data: null, error: null }))

describe('IssueComments server refresh and deletion failures', () => {
  it('reconciles the rendered thread when server comment props change', () => {
    const first = comment()
    const second = comment({ id: 'comment_2', body: 'Arrived after refresh' })
    const { rerender } = render(
      <IssueComments comments={[first]} onCreateComment={createComment} />
    )

    expect(screen.getByText('Initial comment')).toBeInTheDocument()
    expect(screen.queryByText('Arrived after refresh')).toBeNull()

    rerender(
      <IssueComments
        comments={[first, second]}
        onCreateComment={createComment}
      />
    )

    expect(screen.getByText('Arrived after refresh')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Comments (2)' })
    ).toBeInTheDocument()
  })

  it('keeps the comment and surfaces an AppError when deletion fails', async () => {
    const existing = comment()
    const onDeleteComment = vi.fn(async () => ({
      data: null,
      error: {
        code: 'projects/comment-delete-failed',
        message: 'The comment service is unavailable.',
      },
    }))

    render(
      <IssueComments
        comments={[existing]}
        currentUserId="user_1"
        onCreateComment={createComment}
        onDeleteComment={onDeleteComment}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Comment actions' }))
    fireEvent.click(await screen.findByText('Delete'))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Comment not deleted')).toBeInTheDocument()
    expect(
      await screen.findByText('The comment service is unavailable.')
    ).toBeInTheDocument()
    expect(screen.getByText('Initial comment')).toBeInTheDocument()
    expect(onDeleteComment).toHaveBeenCalledWith(existing.id)
  })
})
