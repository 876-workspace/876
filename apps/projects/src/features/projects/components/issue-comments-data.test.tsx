import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Comment } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))

vi.mock('@/lib/client', () => ({
  commentsClient: { create: createMock },
}))

import { IssueCommentsData } from './issue-comments-data'

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    object: 'projects.comment',
    id: 'cmt_1',
    tenantId: 'tnt_1',
    issueId: 'iss_1',
    authorUserId: 'usr_author',
    body: 'Existing context for the agent.',
    createdAt: 1788400000,
    updatedAt: 1788400000,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('IssueCommentsData', () => {
  it('renders the seeded thread for the issue', () => {
    render(<IssueCommentsData issueRef="CONSOLE-12" comments={[comment()]} />)

    expect(screen.getByText('Comments (1)')).toBeInTheDocument()
    expect(
      screen.getByText('Existing context for the agent.')
    ).toBeInTheDocument()
  })

  it('creates the comment scoped to the rendered issue reference', async () => {
    const user = userEvent.setup()
    createMock.mockResolvedValue({
      data: comment({ id: 'cmt_2', body: 'Requester specification' }),
      error: null,
    })
    render(<IssueCommentsData issueRef="CONSOLE-12" comments={[]} />)

    await user.type(
      screen.getByPlaceholderText(/add a comment/i),
      'Requester specification'
    )
    await user.click(screen.getByRole('button', { name: 'Comment' }))

    expect(createMock).toHaveBeenCalledWith({
      issueRef: 'CONSOLE-12',
      body: 'Requester specification',
    })
    expect(
      await screen.findByText('Requester specification')
    ).toBeInTheDocument()
  })

  it('shows the failure banner when creation fails and keeps the draft', async () => {
    const user = userEvent.setup()
    createMock.mockResolvedValue({
      data: null,
      error: { code: 'error/bad-request', message: 'Issue not found.' },
    })
    render(<IssueCommentsData issueRef="CONSOLE-12" comments={[]} />)

    await user.type(screen.getByPlaceholderText(/add a comment/i), 'Draft body')
    await user.click(screen.getByRole('button', { name: 'Comment' }))

    expect(await screen.findByText('Comment not added')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Draft body')).toBeInTheDocument()
  })
})
