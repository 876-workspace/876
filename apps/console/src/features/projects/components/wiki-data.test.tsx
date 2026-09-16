// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeProject,
  makeWikiPage,
  makeWikiRevision,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveProject: vi.fn(),
  listPages: vi.fn(),
  retrievePage: vi.fn(),
  listRevisions: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/projects/proj_test/wiki',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projects: {
      retrieve: mocks.retrieveProject,
    },
    wiki: {
      list: mocks.listPages,
      retrieve: mocks.retrievePage,
      listRevisions: mocks.listRevisions,
    },
  },
}))

import { ProjectWikiData, WikiPageData, WikiRevisionsData } from './wiki-data'

afterEach(cleanup)

describe('ProjectWikiData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.listPages.mockResolvedValue({
      data: listOf([makeWikiPage()]),
      error: null,
    })
  })

  it('renders the page tree with links under the record base', async () => {
    render(
      await ProjectWikiData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      }),
    )

    expect(mocks.listPages).toHaveBeenCalledWith('org_1', 'proj_test', {
      limit: 100,
    })
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/wiki/wp_1',
    )
  })

  it('shows a banner when pages cannot be loaded', async () => {
    mocks.listPages.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectWikiData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      }),
    )

    expect(
      screen.getByText('Wiki pages could not be loaded'),
    ).toBeInTheDocument()
  })
})

describe('WikiPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.retrievePage.mockResolvedValue({
      data: makeWikiPage(),
      error: null,
    })
    mocks.listPages.mockResolvedValue({
      data: listOf([makeWikiPage()]),
      error: null,
    })
    mocks.listRevisions.mockResolvedValue({
      data: listOf([makeWikiRevision()]),
      error: null,
    })
  })

  it('renders the page body with revisions and no restore buttons', async () => {
    render(
      await WikiPageData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        pageRef: 'home',
      }),
    )

    expect(mocks.retrievePage).toHaveBeenCalledWith(
      'org_1',
      'proj_test',
      'home',
    )
    expect(screen.getAllByText('Revision 3').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(document.querySelector('form')).toBeNull()
  })

  it('links to the full revisions record', async () => {
    render(
      await WikiPageData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        pageRef: 'home',
      }),
    )

    expect(
      screen.getByRole('link', { name: 'View all revisions' }),
    ).toHaveAttribute(
      'href',
      '/projects/projects/proj_test/wiki/wp_1/revisions',
    )
  })

  it('calls notFound for an unknown page', async () => {
    mocks.retrievePage.mockResolvedValue({
      data: null,
      error: { code: 'projects/wiki-page-not-found', message: 'missing' },
    })

    await expect(
      WikiPageData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        pageRef: 'missing',
      }),
    ).rejects.toThrow('not-found')
  })
})

describe('WikiRevisionsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.retrievePage.mockResolvedValue({
      data: makeWikiPage(),
      error: null,
    })
    mocks.listRevisions.mockResolvedValue({
      data: listOf([
        makeWikiRevision(),
        makeWikiRevision({ id: 'rev_2' }),
      ]),
      error: null,
    })
  })

  it('lists every revision without restore forms', async () => {
    render(
      await WikiRevisionsData({
        organizationId: 'org_1',
        projectId: 'proj_test',
        pageRef: 'home',
      }),
    )

    expect(screen.getAllByText(/Revision \d/)).toHaveLength(2)
    expect(document.querySelector('form')).toBeNull()
  })

  it('shows a banner when revisions cannot be loaded', async () => {
    mocks.listRevisions.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await WikiRevisionsData({
        organizationId: 'org_1',
        projectId: 'proj_test',
        pageRef: 'home',
      }),
    )

    expect(
      screen.getByText('Wiki revisions could not be loaded'),
    ).toBeInTheDocument()
  })
})
