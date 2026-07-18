import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrgSwitcher, type OrgSwitcherOrg } from './org-switcher'

function createOrg(overrides: Partial<OrgSwitcherOrg> = {}): OrgSwitcherOrg {
  return {
    id: 'org_01JAMAICA876',
    name: 'Marley Logistics',
    slug: 'marley-logistics',
    role: 'Owner',
    ...overrides,
  }
}

describe('OrgSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the current organization name in an accessibly named trigger', () => {
    const current = createOrg()
    const onSelect = vi.fn()

    render(
      <OrgSwitcher current={current} orgs={[current]} onSelect={onSelect} />
    )

    expect(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Marley Logistics',
      })
    ).toHaveTextContent('Marley Logistics')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('falls back to the current slug in the trigger when its name is null', () => {
    const current = createOrg({ name: null, slug: 'kingston-couriers' })
    const onSelect = vi.fn()

    render(
      <OrgSwitcher current={current} orgs={[current]} onSelect={onSelect} />
    )

    expect(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: kingston-couriers',
      })
    ).toHaveTextContent('kingston-couriers')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows the current organization details and role when opened', async () => {
    const user = userEvent.setup()
    const current = createOrg()
    const onSelect = vi.fn()
    render(
      <OrgSwitcher current={current} orgs={[current]} onSelect={onSelect} />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Marley Logistics',
      })
    )

    const slug = await screen.findByText('@marley-logistics')
    const details = slug.parentElement
    expect(details).not.toBeNull()
    expect(
      within(details as HTMLElement).getByText('Marley Logistics')
    ).toBeVisible()
    expect(slug).toBeVisible()
    expect(within(details as HTMLElement).getByText('Owner')).toBeVisible()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('omits the role badge when the current organization has no role', async () => {
    const user = userEvent.setup()
    const current = createOrg({ role: null })
    const onSelect = vi.fn()
    render(
      <OrgSwitcher current={current} orgs={[current]} onSelect={onSelect} />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Marley Logistics',
      })
    )

    expect(await screen.findByText('@marley-logistics')).toBeVisible()
    expect(screen.queryByText('Owner')).not.toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('lists every organization and marks only the current organization', async () => {
    const user = userEvent.setup()
    const current = createOrg()
    const other = createOrg({
      id: 'org_01MONTEGOBAY',
      name: 'Montego Bay Dispatch',
      slug: 'montego-bay-dispatch',
      role: 'Member',
    })
    const onSelect = vi.fn()
    render(
      <OrgSwitcher
        current={current}
        orgs={[current, other]}
        onSelect={onSelect}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Marley Logistics',
      })
    )

    const currentItem = await screen.findByRole('menuitem', {
      name: 'Marley Logistics',
    })
    const otherItem = screen.getByRole('menuitem', {
      name: 'Montego Bay Dispatch',
    })
    expect(screen.getAllByRole('menuitem')).toEqual([currentItem, otherItem])
    expect(currentItem).toHaveAttribute('aria-current', 'true')
    expect(currentItem.querySelectorAll('svg')).toHaveLength(1)
    expect(otherItem).not.toHaveAttribute('aria-current')
    expect(otherItem.querySelectorAll('svg')).toHaveLength(0)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('selects another organization exactly once with its full object', async () => {
    const user = userEvent.setup()
    const current = createOrg()
    const other = createOrg({
      id: 'org_01MONTEGOBAY',
      name: 'Montego Bay Dispatch',
      slug: 'montego-bay-dispatch',
      role: 'Member',
    })
    const onSelect = vi.fn()
    render(
      <OrgSwitcher
        current={current}
        orgs={[current, other]}
        onSelect={onSelect}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Marley Logistics',
      })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Montego Bay Dispatch' })
    )

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(other)
  })

  it('does not select the organization that is already current', async () => {
    const user = userEvent.setup()
    const current = createOrg()
    const onSelect = vi.fn()
    render(
      <OrgSwitcher current={current} orgs={[current]} onSelect={onSelect} />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Marley Logistics',
      })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Marley Logistics' })
    )

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('opens and selects another organization with the keyboard', async () => {
    const user = userEvent.setup()
    const current = createOrg()
    const other = createOrg({
      id: 'org_01MONTEGOBAY',
      name: 'Montego Bay Dispatch',
      slug: 'montego-bay-dispatch',
      role: 'Member',
    })
    const onSelect = vi.fn()
    render(
      <OrgSwitcher
        current={current}
        orgs={[current, other]}
        onSelect={onSelect}
      />
    )
    screen
      .getByRole('button', {
        name: 'Switch organization. Current organization: Marley Logistics',
      })
      .focus()

    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('menuitem', { name: 'Marley Logistics' })
    ).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(other)
  })
})
