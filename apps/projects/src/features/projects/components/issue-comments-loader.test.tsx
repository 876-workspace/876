import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import type { Comment } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listMock, commentsDataMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  commentsDataMock: vi.fn(),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: { comments: { list: listMock } },
}))

vi.mock('@/features/projects/components/issue-comments-data', () => ({
  IssueCommentsData: (props: Record<string, unknown>) => {
    commentsDataMock(props)
    return <div>Comment thread</div>
  },
}))

import { IssueCommentsLoader } from './issue-comments-loader'

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

describe('IssueCommentsLoader', () => {
  it('requests the thread for the organization and issue it was given', async () => {
    listMock.mockResolvedValue({ data: { data: [comment()] }, error: null })

    render(await IssueCommentsLoader({ orgId: 'org_1', issueRef: 'PROJ-12' }))

    expect(listMock).toHaveBeenCalledTimes(1)
    expect(listMock).toHaveBeenCalledWith('org_1', 'PROJ-12')
  })

  it('hands the loaded comments and the viewer to the thread', async () => {
    const loaded = comment()
    listMock.mockResolvedValue({ data: { data: [loaded] }, error: null })

    render(
      await IssueCommentsLoader({
        orgId: 'org_1',
        issueRef: 'PROJ-12',
        currentUserId: 'usr_author',
      })
    )

    expect(commentsDataMock).toHaveBeenCalledWith({
      issueRef: 'PROJ-12',
      comments: [loaded],
      currentUserId: 'usr_author',
    })
  })

  it('renders an empty thread rather than failing when the issue has no comments', async () => {
    listMock.mockResolvedValue({ data: { data: [] }, error: null })

    render(await IssueCommentsLoader({ orgId: 'org_1', issueRef: 'PROJ-12' }))

    expect(commentsDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ comments: [] })
    )
    expect(screen.getByText('Comment thread')).toBeInTheDocument()
  })

  it('shows the failure instead of an empty thread when the request fails', async () => {
    listMock.mockResolvedValue({
      data: null,
      error: { code: 'projects/comments-unavailable', message: 'Nope.' },
    })

    render(await IssueCommentsLoader({ orgId: 'org_1', issueRef: 'PROJ-12' }))

    expect(commentsDataMock).not.toHaveBeenCalled()
    expect(screen.getByText('Comments could not be loaded')).toBeInTheDocument()
  })
})
