// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
  getPlatformOrganization: vi.fn(),
  listProjects: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useSearchParams: () => mocks.searchParams,
  useSelectedLayoutSegments: () => mocks.segments,
  usePathname: () => '/projects/projects',
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
    projects: {
      list: mocks.listProjects,
    },
  },
}))

import PlatformProjectsLayout from './layout'
import PlatformProjectsPage from './(list)/page'

describe('PlatformProjectsLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
    mocks.getPlatformOrganization.mockResolvedValue({ id: 'org_platform' })
    mocks.listProjects.mockReturnValue(new Promise(() => {}))
  })

  afterEach(cleanup)

  it('renders the toolbar and child content in layout', async () => {
    const layout = await PlatformProjectsLayout({
      children: <div>Project Detail Content</div>,
    })

    render(layout)

    expect(
      screen.getByRole('heading', { name: 'All Projects' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/projects/projects/new'
    )
    expect(screen.getByText('Project Detail Content')).toBeInTheDocument()
  })

  it('returns null from (list)/page.tsx', () => {
    expect(PlatformProjectsPage()).toBeNull()
  })
})
