// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  listData: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/orgs',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('./_components/org-search-bar', () => ({
  OrgSearchBar: () => <input aria-label="Search organizations" />,
}))

vi.mock('./_components/orgs-list-data', () => ({
  OrgsListData: (props: Record<string, string | undefined>) => {
    mocks.listData(props)
    return <div data-testid="orgs-list-data">Acme</div>
  },
}))

import OrganizationsPage from './page'

describe('OrganizationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('renders the status-filter toolbar with Add and the organization table content', async () => {
    render(await OrganizationsPage({ searchParams: Promise.resolve({}) }))

    expect(
      screen.getByRole('heading', { name: 'All Organizations' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/orgs/new'
    )
    expect(screen.getByTestId('orgs-list-data')).toHaveTextContent('Acme')
  })

  it('threads a recognised status into the list data request', async () => {
    render(
      await OrganizationsPage({
        searchParams: Promise.resolve({ status: 'archived' }),
      })
    )

    expect(mocks.listData).toHaveBeenCalledTimes(1)
    expect(mocks.listData).toHaveBeenCalledWith({
      after: undefined,
      before: undefined,
      q: undefined,
      status: 'archived',
    })
  })

  it('resolves an unknown status to all before requesting list data', async () => {
    render(
      await OrganizationsPage({
        searchParams: Promise.resolve({ status: 'unknown' }),
      })
    )

    expect(mocks.listData).toHaveBeenCalledWith({
      after: undefined,
      before: undefined,
      q: undefined,
      status: 'all',
    })
  })
})
