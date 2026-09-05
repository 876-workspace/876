// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
  resolveOrg: vi.fn(),
  listIssues: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useSearchParams: () => mocks.searchParams,
  useSelectedLayoutSegments: () => mocks.segments,
  usePathname: () => '/workspace/efesto/projects/issues',
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => mocks.segments,
  useListDetailRoute: () => ({ open: false, takeover: false }),
  ListDetailShell: ({
    toolbar,
    list,
    detail,
  }: {
    toolbar: React.ReactNode
    list: React.ReactNode
    detail: React.ReactNode
  }) => (
    <div data-slot="list-detail-shell">
      {toolbar}
      {list}
      {detail}
    </div>
  ),
}))

vi.mock('@/features/orgs/org-data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    issues: {
      list: mocks.listIssues,
    },
  },
}))

import OrganizationIssuesLayout from './layout'
import OrganizationIssuesPage from './(list)/page'

describe('OrganizationIssuesLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      name: 'Efesto',
      slug: 'efesto',
    })
    mocks.listIssues.mockReturnValue(new Promise(() => {}))
  })

  afterEach(cleanup)

  it('renders only child content so record routes are full pages', () => {
    const layout = OrganizationIssuesLayout({
      children: <div>Workspace Issue Detail Content</div>,
    })

    render(layout)

    expect(
      screen.getByText('Workspace Issue Detail Content')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('list-detail-shell')).not.toBeInTheDocument()
  })

  it('renders the list page as a page instead of a detail shell', async () => {
    mocks.listIssues.mockResolvedValue({ data: { data: [] }, error: null })
    const page = await OrganizationIssuesPage({
      params: Promise.resolve({ orgSlug: 'efesto' }),
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByTestId('page')).toBeInTheDocument()
    expect(screen.queryByTestId('list-detail-shell')).not.toBeInTheDocument()
  })
})
