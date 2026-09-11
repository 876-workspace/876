// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { AdminOrganization } from '@876/platform/compat'

import { OrgsList } from './orgs-list'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/orgs',
}))

vi.mock('./org-table', () => ({
  OrgTable: ({ data }: { data: AdminOrganization[] }) => (
    <div data-testid="orgs-table">
      {data.map((org) => (
        <span key={org.id}>{org.slug}</span>
      ))}
    </div>
  ),
}))

vi.mock('@/lib/analytics/track-event-on-mount', () => ({
  TrackMCEventOnMount: () => null,
}))

function anOrg(overrides: Partial<AdminOrganization> = {}): AdminOrganization {
  return {
    id: 'org_1',
    object: 'organization',
    name: 'Acme',
    slug: 'acme',
    status: 'active',
    logo_url: null,
    primary_email: 'hello@acme.example',
    primary_contact_user_id: null,
    website_url: null,
    created_at: 1700000000,
    ...overrides,
  } as AdminOrganization
}

const orgs: AdminOrganization[] = [
  anOrg(),
  anOrg({
    id: 'org_2',
    name: 'Sterling',
    slug: 'sterling',
    status: 'archived',
    primary_email: 'hello@sterling.example',
  }),
]

describe('OrgsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the full table when no organization is open', () => {
    render(
      <OrgsList
        orgs={orgs}
        subscriptionsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.getByTestId('orgs-table')).toBeInTheDocument()
    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="list-pane"]')).toBeNull()
  })

  it('renders the condensed pane with a selected row when one is open', () => {
    mocks.segments = ['acme']
    render(
      <OrgsList
        orgs={orgs}
        subscriptionsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.queryByTestId('orgs-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View organization Acme' })
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('link', { name: 'View organization Sterling' })
    ).not.toHaveAttribute('aria-current')
  })

  it('preserves the list query in pane links', () => {
    mocks.segments = ['acme']
    mocks.searchParams = new URLSearchParams('status=all')
    render(
      <OrgsList
        orgs={orgs}
        subscriptionsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View organization Acme' })
    ).toHaveAttribute('href', '/orgs/acme?status=all')
  })

  it('renders rows supplied by the server for a status-filtered URL', () => {
    mocks.searchParams = new URLSearchParams('status=archived')
    render(
      <OrgsList
        orgs={orgs}
        subscriptionsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(screen.getByText('sterling')).toBeInTheDocument()
  })

  it('renders rows supplied by the server for a search URL', () => {
    mocks.searchParams = new URLSearchParams('q=sterling')
    render(
      <OrgsList
        orgs={orgs}
        subscriptionsMap={{}}
        isSearching={false}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(screen.getByText('sterling')).toBeInTheDocument()
  })

  it('renders the searching empty state when the query matches nothing', () => {
    mocks.searchParams = new URLSearchParams('q=nobody')
    render(
      <OrgsList
        orgs={[]}
        subscriptionsMap={{}}
        isSearching
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.getByText(/matched "nobody"/)).toBeInTheDocument()
  })
})
