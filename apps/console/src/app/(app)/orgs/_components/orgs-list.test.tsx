// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { AdminOrganization } from '@876/platform/compat'

import { OrgsList } from './orgs-list'

const mocks = vi.hoisted(() => ({
  pathname: '/orgs',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => mocks.pathname,
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
    mocks.pathname = '/orgs'
  })

  it('renders the full table', () => {
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

  it('keeps the table rendered when a detail pathname is active', () => {
    mocks.pathname = '/orgs/acme'
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
    expect(document.querySelector('[data-slot="list-pane"]')).toBeNull()
  })

  it('renders the table rows supplied by the server', () => {
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
    expect(
      screen.getByText('No organizations matched this search.')
    ).toBeInTheDocument()
  })
})
