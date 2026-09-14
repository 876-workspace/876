/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { SidebarProvider } from '@876/ui/sidebar'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pathname: '/island-logistics' }))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

import { Sidebar } from './sidebar'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

function renderSidebar() {
  return render(
    <SidebarProvider>
      <Sidebar basePath="/island-logistics" tenantName="Island Logistics" />
    </SidebarProvider>
  )
}

describe('Sidebar context switch', () => {
  it('renders the app rail outside settings, including Requests', () => {
    mocks.pathname = '/island-logistics/customers'

    renderSidebar()

    expect(screen.getByRole('link', { name: 'Requests' })).toHaveAttribute(
      'href',
      '/island-logistics/requests'
    )
    expect(screen.getByRole('link', { name: 'Customers' })).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Roles' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Back to main navigation' })
    ).not.toBeInTheDocument()
  })

  it('swaps to the settings rail on the settings hub', () => {
    mocks.pathname = '/island-logistics/settings'

    renderSidebar()

    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/island-logistics/settings/users'
    )
    expect(screen.getByRole('link', { name: 'Roles' })).toHaveAttribute(
      'href',
      '/island-logistics/settings/users/roles'
    )
    expect(screen.getByRole('link', { name: 'Finance' })).toHaveAttribute(
      'href',
      '/island-logistics/settings/finance'
    )
    expect(
      screen.getByRole('link', { name: 'Back to main navigation' })
    ).toHaveAttribute('href', '/island-logistics')
    expect(
      screen.queryByRole('link', { name: 'Customers' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Requests' })
    ).not.toBeInTheDocument()
  })

  it('keeps the settings rail on a nested detail route', () => {
    mocks.pathname = '/island-logistics/settings/users/roles/new'

    const { unmount } = renderSidebar()

    expect(screen.getByRole('link', { name: 'Roles' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Users' })).not.toHaveAttribute(
      'aria-current'
    )
    expect(
      screen.getByRole('link', { name: 'Back to main navigation' })
    ).toBeVisible()
    unmount()
  })

  it('keeps the org header visible in both contexts', () => {
    mocks.pathname = '/island-logistics/settings/branding'

    renderSidebar()

    expect(
      screen.getByRole('link', { name: /Island Logistics/i })
    ).toHaveAttribute('href', '/island-logistics')
  })
})
