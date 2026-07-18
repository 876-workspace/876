/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  orgSwitcher: vi.fn(),
  switchOrganization: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: { auth: { switchOrganization: mocks.switchOrganization } },
}))
vi.mock('@876/ui/org-switcher', () => ({
  OrgSwitcher: (props: {
    current: OrgSwitcherOrg
    orgs: OrgSwitcherOrg[]
    onSelect: (org: OrgSwitcherOrg) => void | Promise<void>
  }) => {
    mocks.orgSwitcher(props)
    return (
      <div>
        <span>Current organization: {props.current.name}</span>
        {props.orgs.map((org) => (
          <button
            key={org.id}
            type="button"
            onClick={() => {
              if (org.id !== props.current.id) void props.onSelect(org)
            }}
          >
            Select {org.name}
          </button>
        ))}
      </div>
    )
  },
}))

import { BillingOrgSwitcher } from './billing-org-switcher'

function createOrganization(
  overrides: Partial<OrgSwitcherOrg> = {}
): OrgSwitcherOrg {
  return {
    id: 'org_island_123',
    name: 'Island Commerce',
    slug: 'island-commerce',
    role: 'owner',
    ...overrides,
  }
}

describe('Billing organization switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.switchOrganization.mockResolvedValue({
      data: { ok: true },
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('passes the complete organization state to the shared switcher', () => {
    const current = createOrganization()

    render(<BillingOrgSwitcher current={current} orgs={[current]} />)

    expect(
      screen.getByText('Current organization: Island Commerce')
    ).toBeVisible()
    expect(mocks.orgSwitcher).toHaveBeenCalledTimes(1)
    expect(mocks.orgSwitcher.mock.calls[0]?.[0]).toEqual({
      current,
      orgs: [current],
      onSelect: expect.any(Function),
    })
    expect(mocks.switchOrganization).not.toHaveBeenCalled()
  })

  it('switches to another organization exactly once and reloads the Billing root', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    const current = createOrganization()
    const other = createOrganization({
      id: 'org_montego_456',
      name: 'Montego Commerce',
      slug: 'montego-commerce',
      role: 'admin',
    })
    render(<BillingOrgSwitcher current={current} orgs={[current, other]} />)

    vi.stubGlobal('location', { ...window.location, assign })
    await user.click(
      screen.getByRole('button', { name: 'Select Montego Commerce' })
    )

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
    expect(mocks.switchOrganization).toHaveBeenCalledTimes(1)
    expect(mocks.switchOrganization).toHaveBeenCalledWith({
      organizationId: 'org_montego_456',
    })
    expect(assign).toHaveBeenCalledWith('/')
  })

  it('does not call the client or navigate when the current organization is selected', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    const current = createOrganization()
    const other = createOrganization({
      id: 'org_montego_456',
      name: 'Montego Commerce',
      slug: 'montego-commerce',
      role: 'admin',
    })
    render(<BillingOrgSwitcher current={current} orgs={[current, other]} />)

    vi.stubGlobal('location', { ...window.location, assign })
    await user.click(
      screen.getByRole('button', { name: 'Select Island Commerce' })
    )

    expect(mocks.switchOrganization).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it('does not navigate when the switch request returns an error envelope', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const current = createOrganization()
    const other = createOrganization({
      id: 'org_archived_789',
      name: 'Archived Commerce',
      slug: 'archived-commerce',
      role: 'member',
    })
    const error = {
      code: 'auth/forbidden',
      message: 'Organization access is not permitted.',
    }
    mocks.switchOrganization.mockResolvedValue({ data: null, error })
    render(<BillingOrgSwitcher current={current} orgs={[current, other]} />)

    vi.stubGlobal('location', { ...window.location, assign })
    await user.click(
      screen.getByRole('button', { name: 'Select Archived Commerce' })
    )

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        '[billing.switch_org.failed]',
        error
      )
    )
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(mocks.switchOrganization).toHaveBeenCalledTimes(1)
    expect(mocks.switchOrganization).toHaveBeenCalledWith({
      organizationId: 'org_archived_789',
    })
    expect(assign).not.toHaveBeenCalled()
  })
})
