// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { AdminUser } from '@876/platform/compat'

import { UsersList } from './users-list'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/users',
}))

vi.mock('./users-table', () => ({
  UsersTable: ({ data }: { data: AdminUser[] }) => (
    <div data-testid="users-table">
      {data.map((user) => (
        <span key={user.id}>{user.email}</span>
      ))}
    </div>
  ),
}))

vi.mock('@/lib/analytics/track-event-on-mount', () => ({
  TrackMCEventOnMount: () => null,
}))

function aUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user_1',
    object: 'user',
    first_name: 'Alejandra',
    last_name: 'Reyes',
    username: 'alejandra',
    email: 'alejandra@example.com',
    avatar: null,
    company: 'Acme',
    company_logo: null,
    company_short_name: null,
    status: 'active',
    banned: false,
    deleted_at: null,
    created_at: 1700000000,
    updated_at: 1700000000,
    ...overrides,
  } as AdminUser
}

const users: AdminUser[] = [
  aUser(),
  aUser({
    id: 'user_2',
    first_name: 'Marcus',
    last_name: 'Sterling',
    username: 'marcus',
    email: 'marcus@example.com',
    status: 'suspended',
  }),
]

describe('UsersList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the full table when no user is open', () => {
    render(
      <UsersList
        users={users}
        enrollmentsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
        filterApplied={false}
      />
    )

    expect(screen.getByTestId('users-table')).toBeInTheDocument()
    expect(screen.getByText('alejandra@example.com')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="list-pane"]')).toBeNull()
  })

  it('renders the condensed pane with a selected row when a user is open', () => {
    mocks.segments = ['alejandra']
    render(
      <UsersList
        users={users}
        enrollmentsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
        filterApplied={false}
      />
    )

    expect(screen.queryByTestId('users-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View user Alejandra Reyes' })
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('link', { name: 'View user Marcus Sterling' })
    ).not.toHaveAttribute('aria-current')
  })

  it('preserves the list query in pane links', () => {
    mocks.segments = ['alejandra']
    mocks.searchParams = new URLSearchParams('status=all')
    render(
      <UsersList
        users={users}
        enrollmentsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
        filterApplied={false}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View user Alejandra Reyes' })
    ).toHaveAttribute('href', '/users/alejandra?status=all')
  })

  it('renders rows supplied by the server for a status-filtered URL', () => {
    mocks.searchParams = new URLSearchParams('status=suspended')
    render(
      <UsersList
        users={users}
        enrollmentsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
        filterApplied={false}
      />
    )

    expect(screen.getByText('alejandra@example.com')).toBeInTheDocument()
    expect(screen.getByText('marcus@example.com')).toBeInTheDocument()
  })

  it('renders rows supplied by the server for a search URL', () => {
    mocks.searchParams = new URLSearchParams('q=marcus')
    render(
      <UsersList
        users={users}
        enrollmentsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
        filterApplied={false}
      />
    )

    expect(screen.getByText('alejandra@example.com')).toBeInTheDocument()
    expect(screen.getByText('marcus@example.com')).toBeInTheDocument()
  })

  it('renders the searching empty state when the query matches nothing', () => {
    mocks.searchParams = new URLSearchParams('q=nobody')
    render(
      <UsersList
        users={[]}
        enrollmentsMap={{}}
        isSearching
        hasMore={false}
        firstId={null}
        lastId={null}
        filterApplied={false}
      />
    )

    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.getByText(/matched "nobody"/)).toBeInTheDocument()
  })
})
