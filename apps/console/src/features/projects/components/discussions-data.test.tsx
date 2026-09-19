// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeDiscussion,
  makeDiscussionPost,
  makeProject,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveProject: vi.fn(),
  listDiscussions: vi.fn(),
  retrieveDiscussion: vi.fn(),
  listPosts: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/projects/proj_test/discussions',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projects: {
      retrieve: mocks.retrieveProject,
    },
    discussions: {
      list: mocks.listDiscussions,
      retrieve: mocks.retrieveDiscussion,
      listPosts: mocks.listPosts,
    },
  },
}))

import { DiscussionThreadData, ProjectDiscussionsData } from './discussions-data'

afterEach(cleanup)

describe('ProjectDiscussionsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.listDiscussions.mockResolvedValue({
      data: listOf([makeDiscussion()]),
      error: null,
    })
  })

  it('lists discussions with links under the record base', async () => {
    render(
      await ProjectDiscussionsData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      }),
    )

    expect(mocks.listDiscussions).toHaveBeenCalledWith('org_1', 'proj_test', {
      limit: 100,
    })
    expect(
      screen.getByRole('link', { name: 'Kickoff planning' }),
    ).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/discussions/disc_1',
    )
  })

  it('sorts pinned discussions first', async () => {
    mocks.listDiscussions.mockResolvedValue({
      data: listOf([
        makeDiscussion({ id: 'disc_b', title: 'Second', pinned: false }),
        makeDiscussion({ id: 'disc_a', title: 'First', pinned: true }),
      ]),
      error: null,
    })

    render(
      await ProjectDiscussionsData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      }),
    )

    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveTextContent('First')
  })

  it('shows a banner when discussions cannot be loaded', async () => {
    mocks.listDiscussions.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectDiscussionsData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      }),
    )

    expect(
      screen.getByText('Discussions could not be loaded'),
    ).toBeInTheDocument()
  })
})

describe('DiscussionThreadData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.retrieveDiscussion.mockResolvedValue({
      data: makeDiscussion(),
      error: null,
    })
    mocks.listPosts.mockResolvedValue({
      data: listOf([makeDiscussionPost()]),
      error: null,
    })
  })

  it('renders the thread without a reply form', async () => {
    render(
      await DiscussionThreadData({
        organizationId: 'org_1',
        projectId: 'proj_test',
        discussionId: 'disc_1',
      }),
    )

    expect(screen.getByText('Kickoff planning')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(document.querySelector('form')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Reply' }),
    ).not.toBeInTheDocument()
  })

  it('banners post failures while keeping the thread', async () => {
    mocks.listPosts.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await DiscussionThreadData({
        organizationId: 'org_1',
        projectId: 'proj_test',
        discussionId: 'disc_1',
      }),
    )

    expect(
      screen.getByText('Some discussion posts could not be loaded'),
    ).toBeInTheDocument()
    expect(screen.getByText('Kickoff planning')).toBeInTheDocument()
  })

  it('calls notFound for an unknown discussion', async () => {
    mocks.retrieveDiscussion.mockResolvedValue({
      data: null,
      error: { code: 'projects/discussion-not-found', message: 'missing' },
    })

    await expect(
      DiscussionThreadData({
        organizationId: 'org_1',
        projectId: 'proj_test',
        discussionId: 'disc_missing',
      }),
    ).rejects.toThrow('not-found')
  })
})
