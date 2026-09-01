/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getWorkspace: vi.fn(),
  listRouting: vi.fn(),
  entitlementsList: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}))

vi.mock('@/lib/services/workspace', () => ({
  getWorkspace: mocks.getWorkspace,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Keep UI primitives real but mock OrgSwitcher to observe props
vi.mock('./org-switcher', () => ({
  OrgSwitcher: ({
    orgs,
    current,
  }: {
    orgs: { slug: string }[]
    current: { slug: string }
  }) => (
    <div
      data-testid="org-switcher"
      data-current={current.slug}
      data-orgs={orgs.map((o) => o.slug).join(',')}
    >
      OrgSwitcher:{orgs.length}
    </div>
  ),
}))

vi.mock('./apps-group', () => ({
  AppsGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="apps-group">{children}</div>
  ),
  AppNavLink: () => null,
}))

vi.mock('./sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}))

vi.mock('./user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

vi.mock('@876/ui/nav-progress', () => ({
  NavProgress: () => null,
}))

vi.mock('@876/ui/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AppShellBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AppShellContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AppShellHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AppShellMain: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AppShellSidebarArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('@876/ui/sidebar', () => ({
  SidebarTrigger: () => <button data-testid="sidebar-trigger" />,
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

import { Shell } from './shell'

function mockCookies(value: string | undefined = undefined) {
  mocks.cookies.mockResolvedValue({
    get: vi.fn().mockReturnValue(value ? { value } : undefined),
  } as unknown)
}

function mockSwitcherOrgs(
  orgs: {
    organization: {
      id: string
      name: string | null
      slug: string
      status: string
    }
    role: string
  }[]
) {
  mocks.listRouting.mockResolvedValue({
    data: orgs.map((o) => ({ data: o, error: null })),
    error: null,
  })
  // Actually buildSwitcherOrgs expects result.data to be array, but our mock above is per org; simpler: mock to return structure used by buildSwitcherOrgs
  mocks.listRouting.mockResolvedValue({
    data: orgs as unknown,
    error: null,
  })
  // The helper wraps via unwrapResult — our mock must return { data: orgs, error: null } where unwrapping yields .data
  // We'll make listRouting return { data: orgs, error: null } directly and unwrapResult will extract .data
  mocks.listRouting.mockResolvedValue({
    data: orgs,
    error: null,
  } as unknown as { data: unknown; error: null })
}

describe('Shell — topbar OrgSwitcher (goldbergyoni AAA, diff: always visible)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookies(undefined)
    mocks.getWorkspace.mockResolvedValue({
      memberships: { list: mocks.listRouting },
      entitlements: {
        list: mocks.entitlementsList.mockResolvedValue({
          data: { data: [] },
          error: null,
        }),
      },
    } as unknown)
    // By default, no switcher orgs -> fallback to [currentOrg]
    mocks.listRouting.mockResolvedValue({
      data: { data: [] },
      error: null,
    } as unknown as never)
  })

  it('always renders OrgSwitcher even when user has single org (diff: fallback topbarOrgs)', async () => {
    // Arrange: switcherOrgs empty -> topbarOrgs = [currentOrg]
    mocks.listRouting.mockResolvedValue({
      data: { data: [] },
      error: null,
    } as unknown as never)
    mockCookies('true')
    // Act
    const ui = await Shell({
      children: <div>content</div>,
      organization: { id: 'org_1', name: 'Acme', slug: 'acme' },
      orgId: 'org_1',
      userId: 'user_1',
      user: { id: 'user_1', email: 'a@b.co' } as unknown as never,
    })
    const { container } = render(ui as React.ReactElement)
    // Assert: OrgSwitcher is rendered (not hidden when length <=1)
    expect(
      container.querySelector('[data-testid="org-switcher"]')
    ).toBeInTheDocument()
  })

  it('passes fallback [currentOrg] when switcherOrgs is empty', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [] },
      error: null,
    } as unknown as never)
    const ui = await Shell({
      children: null,
      organization: { id: 'org_1', name: null, slug: 'acme' },
      orgId: 'org_1',
      userId: 'user_1',
      user: {} as never,
    })
    const { container } = render(ui as React.ReactElement)
    const switcher = container.querySelector('[data-testid="org-switcher"]')
    expect(switcher).toHaveAttribute('data-orgs', 'acme')
    expect(switcher).toHaveAttribute('data-current', 'acme')
  })

  it('uses switcherOrgs when available (multiple orgs)', async () => {
    const memberships = [
      {
        organization: {
          id: 'org_1',
          name: 'Acme',
          slug: 'acme',
          status: 'active',
        },
        role: 'staff',
      },
      {
        organization: {
          id: 'org_2',
          name: 'Beta',
          slug: 'beta',
          status: 'active',
        },
        role: 'super-admin',
      },
    ]
    // Mock platform to return two active orgs
    mocks.listRouting.mockResolvedValue({
      error: null,
      data: { data: memberships },
    } as unknown as never)
    // Need to mock unwrapResult behavior: buildSwitcherOrgs does unwrapResult(result).data.filter...
    // Our mock returns { data: memberships, error: null }, and unwrapResult will return { data: memberships }
    // So we need to have memberships wrapped as if result.data is memberships and unwrap extracts it — we simulate via vi.mocked unwrapResult not needed; but our mock of getPlatformClient returns listRouting that returns { data: memberships, error: null }
    // However buildSwitcherOrgs does: const result = await client.memberships.listRouting(...); if(result.error) return []; return unwrapResult(result).data.filter...
    // unwrapResult for { data: memberships, error:null } returns memberships directly as .data, so our shape is wrong. Let's make listRouting return { data: memberships, error: null } and rely on real unwrapResult.
    // For test, we can just make listRouting return memberships wrapped in data, and unwrap will work if memberships is array
    // Simpler: mock listRouting to return the structure that unwrap expects: result.data = memberships is not the envelope, it's the unwrapped. Let's mock to return what unwrap expects
    // We'll patch by making listRouting return what the real client would: { data: memberships, error:null } and then our shell's buildSwitcherOrgs will call unwrapResult(result, ...) which expects result.data to be memberships array
    // Our current mock does that, so we need to ensure memberships are passed correctly
    // Re-mock correctly
    mocks.listRouting.mockResolvedValue({
      data: { data: memberships },
      error: null,
    } as unknown as never)

    const ui = await Shell({
      children: null,
      organization: { id: 'org_1', name: 'Acme', slug: 'acme' },
      orgId: 'org_1',
      userId: 'user_1',
      user: {} as never,
    })
    const { container } = render(ui as React.ReactElement)
    const switcher = container.querySelector('[data-testid="org-switcher"]')
    // Should have both orgs
    expect(switcher?.getAttribute('data-orgs')).toContain('acme')
    expect(switcher?.getAttribute('data-orgs')).toContain('beta')
  })

  it('degrades to single-org view on platform error (never crashes)', async () => {
    mocks.listRouting.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'boom' },
    } as unknown as never)
    const ui = await Shell({
      children: <div>ok</div>,
      organization: { id: 'org_1', name: 'Acme', slug: 'acme' },
      orgId: 'org_1',
      userId: 'user_1',
      user: {} as never,
    })
    const { container } = render(ui as React.ReactElement)
    expect(
      container.querySelector('[data-testid="org-switcher"]')
    ).toBeInTheDocument()
    expect(
      container
        .querySelector('[data-testid="org-switcher"]')
        ?.getAttribute('data-orgs')
    ).toBe('acme')
  })

  it('builds currentOrg from organization prop verbatim', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [] },
      error: null,
    } as unknown as never)
    const ui = await Shell({
      children: null,
      organization: { id: 'org_99', name: 'My Org', slug: 'my-org' },
      orgId: 'org_99',
      userId: 'user_1',
      user: {} as never,
    })
    const { container } = render(ui as React.ReactElement)
    const switcher = container.querySelector('[data-testid="org-switcher"]')
    expect(switcher).toHaveAttribute('data-current', 'my-org')
    expect(switcher).toHaveAttribute('data-orgs', 'my-org')
  })

  it('is isolated — second render with different org does not leak previous topbarOrgs', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [] },
      error: null,
    } as unknown as never)
    const first = await Shell({
      children: null,
      organization: { id: 'org_1', name: 'First', slug: 'first' },
      orgId: 'org_1',
      userId: 'user_1',
      user: {} as never,
    })
    const { container: c1, unmount } = render(first as React.ReactElement)
    expect(
      c1
        .querySelector('[data-testid="org-switcher"]')
        ?.getAttribute('data-current')
    ).toBe('first')
    unmount()
    const second = await Shell({
      children: null,
      organization: { id: 'org_2', name: 'Second', slug: 'second' },
      orgId: 'org_2',
      userId: 'user_2',
      user: {} as never,
    })
    const { container: c2 } = render(second as React.ReactElement)
    expect(
      c2
        .querySelector('[data-testid="org-switcher"]')
        ?.getAttribute('data-current')
    ).toBe('second')
  })
})
