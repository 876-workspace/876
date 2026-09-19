/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppSwitcherApp } from '@876/ui/app-switcher'

const mocks = vi.hoisted(() => ({
  appSwitcher: vi.fn(),
}))

vi.mock('@876/ui/app-switcher', () => ({
  AppSwitcher: ({ apps }: { apps: AppSwitcherApp[] }) => {
    mocks.appSwitcher({ apps })

    return (
      <div>
        <button
          type="button"
          aria-label="App switcher"
          onClick={(event) => {
            event.currentTarget.nextElementSibling?.removeAttribute('hidden')
          }}
        />
        <div role="menu" hidden>
          {apps.map((app) => (
            <a
              key={`${app.name}:${app.url}`}
              role="menuitem"
              href={app.url}
              aria-current={app.current ? 'page' : undefined}
            >
              {app.name}
            </a>
          ))}
        </div>
      </div>
    )
  },
}))

const APP_URL_ENV_NAMES = [
  'NEXT_PUBLIC_CONSUMER_URL',
  'NEXT_PUBLIC_ENTERPRISE_URL',
  'NEXT_PUBLIC_BILLING_URL',
  'NEXT_PUBLIC_COURIERS_URL',
] as const

function stubAppUrls(
  urls: Partial<Record<(typeof APP_URL_ENV_NAMES)[number], string>>
) {
  for (const name of APP_URL_ENV_NAMES) vi.stubEnv(name, urls[name])
}

function findGlobalAddDivider(container: HTMLElement): HTMLDivElement | null {
  return container.querySelector('div[aria-hidden="true"].bg-border')
}

describe('Console TopbarActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('hides the global add button and its divider when showGlobalAdd is false', async () => {
    const { TopbarActions } = await import('@/components/shell/topbar-actions')
    const { container } = render(
      <TopbarActions showGlobalAdd={false} showAppSwitcher={false} />
    )

    expect(
      screen.queryByRole('button', { name: 'Create new' })
    ).not.toBeInTheDocument()
    expect(findGlobalAddDivider(container)).toBeNull()
    expect(mocks.appSwitcher).not.toHaveBeenCalled()
  })

  it('shows the global add button and its divider when showGlobalAdd is true', async () => {
    const { TopbarActions } = await import('@/components/shell/topbar-actions')
    const { container } = render(
      <TopbarActions showGlobalAdd={true} showAppSwitcher={false} />
    )

    expect(screen.getByRole('button', { name: 'Create new' })).toBeVisible()
    expect(findGlobalAddDivider(container)).toBeVisible()
    expect(mocks.appSwitcher).not.toHaveBeenCalled()
  })

  it('hides the app switcher when showAppSwitcher is false', async () => {
    const { TopbarActions } = await import('@/components/shell/topbar-actions')
    render(<TopbarActions showGlobalAdd={false} showAppSwitcher={false} />)

    expect(
      screen.queryByRole('button', { name: 'App switcher' })
    ).not.toBeInTheDocument()
    expect(mocks.appSwitcher).not.toHaveBeenCalled()
  })

  it('opens the app switcher with the configured app directory', async () => {
    const user = userEvent.setup()
    stubAppUrls({
      NEXT_PUBLIC_CONSUMER_URL: 'https://app.preview.876.test',
      NEXT_PUBLIC_ENTERPRISE_URL: 'https://enterprise.preview.876.test',
      NEXT_PUBLIC_BILLING_URL: 'https://billing.preview.876.test',
      NEXT_PUBLIC_COURIERS_URL: 'https://couriers.preview.876.test',
    })
    const { TopbarActions } = await import('@/components/shell/topbar-actions')
    render(<TopbarActions showGlobalAdd={false} showAppSwitcher={true} />)

    await user.click(screen.getByRole('button', { name: 'App switcher' }))

    const expectedApps: AppSwitcherApp[] = [
      { name: 'Console', url: '/', current: true },
      { name: '876', url: 'https://app.preview.876.test' },
      { name: 'Enterprise', url: 'https://enterprise.preview.876.test' },
      { name: 'Billing', url: 'https://billing.preview.876.test' },
      { name: 'Couriers', url: 'https://couriers.preview.876.test' },
    ]
    expect(mocks.appSwitcher).toHaveBeenCalledTimes(1)
    expect(mocks.appSwitcher).toHaveBeenCalledWith({ apps: expectedApps })

    const menu = screen.getByRole('menu')
    const links = within(menu).getAllByRole('menuitem')
    expect(links.map((link) => link.textContent)).toEqual([
      'Console',
      '876',
      'Enterprise',
      'Billing',
      'Couriers',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      'https://app.preview.876.test',
      'https://enterprise.preview.876.test',
      'https://billing.preview.876.test',
      'https://couriers.preview.876.test',
    ])
    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([
      'page',
      null,
      null,
      null,
      null,
    ])
  })

  it('omits an app whose origin is unset instead of guessing one', async () => {
    const user = userEvent.setup()
    stubAppUrls({
      NEXT_PUBLIC_CONSUMER_URL: 'https://app.preview.876.test',
      NEXT_PUBLIC_COURIERS_URL: 'https://couriers.preview.876.test',
    })
    const { TopbarActions } = await import('@/components/shell/topbar-actions')
    render(<TopbarActions showGlobalAdd={false} showAppSwitcher={true} />)

    await user.click(screen.getByRole('button', { name: 'App switcher' }))

    expect(mocks.appSwitcher).toHaveBeenCalledTimes(1)
    expect(mocks.appSwitcher.mock.calls[0]?.[0]).toEqual({
      apps: [
        { name: 'Console', url: '/', current: true },
        { name: '876', url: 'https://app.preview.876.test' },
        { name: 'Couriers', url: 'https://couriers.preview.876.test' },
      ],
    })
    const menu = screen.getByRole('menu')
    const links = within(menu).getAllByRole('menuitem')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      'https://app.preview.876.test',
      'https://couriers.preview.876.test',
    ])
    expect(
      links.some((link) => link.getAttribute('href')?.includes('876.app'))
    ).toBe(false)
  })

  it('pins Help to the public documentation URL', async () => {
    const { TopbarActions } = await import('@/components/shell/topbar-actions')
    render(<TopbarActions showGlobalAdd={false} showAppSwitcher={false} />)

    const help = screen.getByRole('link', { name: 'Help' })
    expect({
      href: help.getAttribute('href'),
      target: help.getAttribute('target'),
      rel: help.getAttribute('rel'),
    }).toEqual({
      href: 'https://docs.876.dev',
      target: '_blank',
      rel: 'noreferrer',
    })
    expect(mocks.appSwitcher).not.toHaveBeenCalled()
  })
})
