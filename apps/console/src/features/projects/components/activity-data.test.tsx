// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeActivityItem, makeProject } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveProject: vi.fn(),
  listActivity: vi.fn(),
  listProjects: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/projects/proj_test/activity',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projects: {
      retrieve: mocks.retrieveProject,
      list: mocks.listProjects,
    },
    activity: {
      listProjectActivity: mocks.listActivity,
    },
  },
}))

import { ActivityData, ProjectActivityData } from './activity-data'

function activityFeed(items: ReturnType<typeof makeActivityItem>[]) {
  return {
    object: 'projects.activity-feed',
    items,
    nextCursor: null,
    hasMore: false,
  } as const
}

afterEach(cleanup)

describe('ProjectActivityData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.listActivity.mockResolvedValue({
      data: activityFeed([makeActivityItem()]),
      error: null,
    })
  })

  it('fetches the project and its activity with the page limit', async () => {
    render(
      await ProjectActivityData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      }),
    )

    expect(mocks.retrieveProject).toHaveBeenCalledWith('org_1', 'proj_test')
    expect(mocks.listActivity).toHaveBeenCalledWith('org_1', 'proj_test', {
      limit: 25,
    })
    expect(screen.getByText('issue_1')).toBeInTheDocument()
  })

  it('forwards the cursor and renders a load-more link', async () => {
    mocks.listActivity.mockResolvedValue({
      data: {
        object: 'projects.activity-feed',
        items: [makeActivityItem()],
        nextCursor: 'cursor_1',
        hasMore: true,
      },
      error: null,
    })

    render(
      await ProjectActivityData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        cursor: 'cursor_0',
      }),
    )

    expect(mocks.listActivity).toHaveBeenCalledWith('org_1', 'proj_test', {
      limit: 25,
      cursor: 'cursor_0',
    })
    expect(screen.getByText('Load more')).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/activity?cursor=cursor_1',
    )
  })

  it('shows a banner when activity cannot be loaded', async () => {
    mocks.listActivity.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectActivityData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      }),
    )

    expect(
      screen.getByText('Activity could not be loaded'),
    ).toBeInTheDocument()
  })

  it('calls notFound for an unknown project', async () => {
    mocks.retrieveProject.mockResolvedValue({
      data: null,
      error: { code: 'projects/project-not-found', message: 'missing' },
    })

    await expect(
      ProjectActivityData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_missing',
      }),
    ).rejects.toThrow('not-found')
  })
})

describe('ActivityData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listProjects.mockResolvedValue({
      data: listOf([makeProject()]),
      error: null,
    })
    mocks.listActivity.mockResolvedValue({
      data: activityFeed([makeActivityItem()]),
      error: null,
    })
  })

  it('aggregates activity across listed projects', async () => {
    render(
      await ActivityData({ organizationId: 'org_1', base: '/projects' }),
    )

    expect(mocks.listProjects).toHaveBeenCalledWith('org_1', { limit: 20 })
    expect(mocks.listActivity).toHaveBeenCalledWith('org_1', 'proj_test', {
      limit: 10,
    })
    expect(screen.getByText('issue_1')).toBeInTheDocument()
  })

  it('shows a banner when the project list cannot be loaded', async () => {
    mocks.listProjects.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ActivityData({ organizationId: 'org_1', base: '/projects' }),
    )

    expect(
      screen.getByText('Activity could not be loaded'),
    ).toBeInTheDocument()
  })
})
