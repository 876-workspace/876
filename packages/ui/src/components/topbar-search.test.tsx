import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TopbarSearch, type TopbarSearchItem } from './topbar-search'

function createItem(
  overrides: Partial<TopbarSearchItem> = {}
): TopbarSearchItem {
  return {
    group: 'Workspace',
    title: 'Overview',
    href: '/org/marley-logistics',
    keywords: ['dashboard', 'home'],
    ...overrides,
  }
}

describe('TopbarSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the placeholder and opens the search dialog when clicked', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <TopbarSearch
        items={[createItem()]}
        onNavigate={onNavigate}
        placeholder="Find a destination"
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Find a destination⌘K' })
    )

    expect(await screen.findByRole('dialog', { name: 'Search' })).toBeVisible()
    const input = screen.getByRole('combobox')
    expect(input).toBeVisible()
    expect(input).toHaveAttribute('placeholder', 'Find a destination')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('opens with Meta+K and closes when the shortcut is pressed again', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<TopbarSearch items={[createItem()]} onNavigate={onNavigate} />)

    await user.keyboard('{Meta>}k{/Meta}')
    expect(await screen.findByRole('dialog', { name: 'Search' })).toBeVisible()
    await user.keyboard('{Meta>}k{/Meta}')

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Search' })
      ).not.toBeInTheDocument()
    })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('opens with Ctrl+K', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<TopbarSearch items={[createItem()]} onNavigate={onNavigate} />)

    await user.keyboard('{Control>}k{/Control}')

    const input = await screen.findByRole('combobox')
    expect(input).toBeVisible()
    expect(input).toHaveAttribute('placeholder', 'Search...')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('does not toggle for a shortcut originating from an input', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <>
        <label htmlFor="shipment-reference">Shipment reference</label>
        <input id="shipment-reference" />
        <TopbarSearch items={[createItem()]} onNavigate={onNavigate} />
      </>
    )
    await user.click(
      screen.getByRole('textbox', { name: 'Shipment reference' })
    )

    await user.keyboard('{Meta>}k{/Meta}')

    expect(
      screen.queryByRole('dialog', { name: 'Search' })
    ).not.toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('does not open when K is pressed without a shortcut modifier', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<TopbarSearch items={[createItem()]} onNavigate={onNavigate} />)

    await user.keyboard('k')

    expect(
      screen.queryByRole('dialog', { name: 'Search' })
    ).not.toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('groups items in first-seen order and renders duplicate hrefs independently', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const sharedHref = '/settings'
    const workspaceSettings = createItem({
      group: 'Workspace',
      title: 'Workspace settings',
      href: sharedHref,
    })
    const billing = createItem({
      group: 'Billing',
      title: 'Invoices',
      href: '/invoices',
    })
    const accountSettings = createItem({
      group: 'Account',
      title: 'Profile settings',
      href: sharedHref,
    })
    const paymentMethods = createItem({
      group: 'Billing',
      title: 'Payment methods',
      href: '/payment-methods',
    })
    render(
      <TopbarSearch
        items={[workspaceSettings, billing, accountSettings, paymentMethods]}
        onNavigate={onNavigate}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Search...⌘K' }))

    const dialog = await screen.findByRole('dialog', { name: 'Search' })
    const headings = dialog.querySelectorAll('[cmdk-group-heading]')
    expect(Array.from(headings).map((heading) => heading.textContent)).toEqual([
      'Workspace',
      'Billing',
      'Account',
    ])
    expect(
      within(dialog).getByRole('option', { name: 'Workspace settings' })
    ).toBeVisible()
    expect(
      within(dialog).getByRole('option', { name: 'Profile settings' })
    ).toBeVisible()
    expect(within(dialog).getAllByRole('option')).toHaveLength(4)
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('closes and navigates exactly once when an item is selected', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const item = createItem({ href: '/org/marley-logistics/shipments' })
    render(<TopbarSearch items={[item]} onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: 'Search...⌘K' }))

    await user.click(await screen.findByRole('option', { name: 'Overview' }))

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Search' })
      ).not.toBeInTheDocument()
    })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith(item.href)
  })

  it('shows the empty state for a non-matching query', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<TopbarSearch items={[createItem()]} onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: 'Search...⌘K' }))

    await user.type(await screen.findByRole('combobox'), 'weather forecast')

    expect(await screen.findByText('No results found.')).toBeVisible()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('finds an item by a keyword that is absent from its title', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const searchable = createItem({
      title: 'Overview',
      keywords: ['dispatch'],
    })
    const other = createItem({
      title: 'Team members',
      href: '/team',
      keywords: ['staff'],
    })
    render(<TopbarSearch items={[searchable, other]} onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: 'Search...⌘K' }))

    await user.type(await screen.findByRole('combobox'), 'dispatch')

    expect(
      await screen.findByRole('option', { name: 'Overview' })
    ).toBeVisible()
    expect(
      screen.queryByRole('option', { name: 'Team members' })
    ).not.toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('removes its keydown listener on unmount', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const onNavigate = vi.fn()
    const { unmount } = render(
      <TopbarSearch items={[createItem()]} onNavigate={onNavigate} />
    )
    const keydownCall = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'keydown'
    )

    unmount()

    expect(keydownCall).toBeDefined()
    expect(removeEventListener).toHaveBeenCalledTimes(1)
    expect(removeEventListener).toHaveBeenCalledWith(
      'keydown',
      keydownCall?.[1]
    )
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
