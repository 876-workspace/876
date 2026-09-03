// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
  getPlatformOrganization: vi.fn(),
  listIssues: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useSearchParams: () => mocks.searchParams,
  useSelectedLayoutSegments: () => mocks.segments,
  usePathname: () => '/projects/issues',
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

vi.mock('@/lib/platform-org', () => ({
  getPlatformOrganization: mocks.getPlatformOrganization,
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    issues: {
      list: mocks.listIssues,
    },
  },
}))

import PlatformIssuesLayout from './layout'
import PlatformIssuesPage from './(list)/page'

describe('PlatformIssuesLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
    mocks.getPlatformOrganization.mockResolvedValue({ id: 'org_platform' })
    mocks.listIssues.mockReturnValue(new Promise(() => {}))
  })

  afterEach(cleanup)

  it('renders the toolbar and child content in layout', async () => {
    const layout = await PlatformIssuesLayout({
      children: <div>Issue Detail Content</div>,
    })

    render(layout)

    expect(
      screen.getByRole('heading', { name: 'All Issues' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/projects/issues/new'
    )
    expect(screen.getByText('Issue Detail Content')).toBeInTheDocument()
  })

  it('returns null from (list)/page.tsx', () => {
    expect(PlatformIssuesPage()).toBeNull()
  })
})
