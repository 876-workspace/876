import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppSwitcher, type AppSwitcherApp } from './app-switcher'

function createApp(overrides: Partial<AppSwitcherApp> = {}): AppSwitcherApp {
  return {
    name: '876 Console',
    url: 'https://console.876.example',
    description: 'Manage the 876 platform',
    current: true,
    ...overrides,
  }
}

describe('AppSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an accessibly named trigger', () => {
    render(<AppSwitcher apps={[createApp()]} />)

    expect(screen.getByRole('button', { name: 'App switcher' })).toBeVisible()
  })

  it('renders one exact link per app and marks only the current app', async () => {
    const user = userEvent.setup()
    const consoleApp = createApp()
    const billingApp = createApp({
      name: '876 Billing',
      url: 'https://billing.876.example/plans',
      description: 'Subscriptions and invoices',
      current: false,
    })
    render(<AppSwitcher apps={[consoleApp, billingApp]} />)

    await user.click(screen.getByRole('button', { name: 'App switcher' }))

    const menu = await screen.findByRole('menu')
    const [consoleLink, billingLink] = within(menu).getAllByRole('menuitem')
    expect(within(menu).getAllByRole('menuitem')).toEqual([
      consoleLink,
      billingLink,
    ])
    expect(consoleLink).toHaveAccessibleName(
      '876 ConsoleManage the 876 platform'
    )
    expect(consoleLink).toHaveProperty('tagName', 'A')
    expect(consoleLink).toHaveAttribute('href', consoleApp.url)
    expect(consoleLink).toHaveAttribute('aria-current', 'page')
    expect(billingLink).toHaveProperty('tagName', 'A')
    expect(billingLink).toHaveAccessibleName(
      '876 BillingSubscriptions and invoices'
    )
    expect(billingLink).toHaveAttribute('href', billingApp.url)
    expect(billingLink).not.toHaveAttribute('aria-current')
  })

  it('renders explicit, two-word, and single-word initials plus optional descriptions', async () => {
    const user = userEvent.setup()
    const explicit = createApp({ initials: 'xy' })
    const twoWord = createApp({
      name: 'courier portal',
      url: 'https://couriers.876.example',
      description: 'Dispatch operations',
      current: false,
    })
    const singleWord = createApp({
      name: 'Billing',
      url: 'https://billing.876.example',
      description: undefined,
      current: false,
    })
    render(<AppSwitcher apps={[explicit, twoWord, singleWord]} />)

    await user.click(screen.getByRole('button', { name: 'App switcher' }))

    const menu = await screen.findByRole('menu')
    const [explicitLink, twoWordLink, singleWordLink] =
      within(menu).getAllByRole('menuitem')
    expect(within(explicitLink).getByText('xy')).toBeVisible()
    expect(within(twoWordLink).getByText('CP')).toBeVisible()
    expect(within(singleWordLink).getByText('BI')).toBeVisible()
    expect(
      within(explicitLink).getByText('Manage the 876 platform')
    ).toBeVisible()
    expect(within(twoWordLink).getByText('Dispatch operations')).toBeVisible()
    expect(
      within(singleWordLink).queryByText('Manage the 876 platform')
    ).not.toBeInTheDocument()
    expect(
      within(singleWordLink).queryByText('Dispatch operations')
    ).not.toBeInTheDocument()
  })
})
