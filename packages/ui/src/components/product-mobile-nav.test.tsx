import type { AnchorHTMLAttributes } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'

import { Settings } from '../icons'
import { ProductMobileNav } from './product-mobile-nav'

const mocks = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    ...props
  }: { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props} />
  ),
}))

const navigation: NavGroupDefinition[] = [
  {
    key: 'workspace',
    entries: [
      {
        key: 'home',
        title: 'Home',
        href: '/',
        icon: 'dashboard',
        colorClassName: 'text-blue-500',
      },
      {
        key: 'sales',
        title: 'Sales',
        href: '/quotes',
        icon: 'sales',
        colorClassName: 'text-purple-500',
        children: [
          {
            key: 'quotes',
            title: 'Quotes',
            href: '/quotes',
            icon: 'sales',
          },
          {
            key: 'invoices',
            title: 'Invoices',
            href: '/invoices',
            icon: 'sales',
          },
        ],
      },
    ],
  },
  {
    key: 'secondary',
    entries: [
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
      },
    ],
  },
]

function renderNav() {
  return render(
    <ProductMobileNav
      title="Billing"
      subtitle="Island Commerce"
      navigation={navigation}
      resolveIcon={() => Settings}
    />
  )
}

describe('ProductMobileNav', () => {
  beforeEach(() => {
    mocks.pathname = '/'
  })

  it('opens a branded drawer with grouped navigation', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(
      screen.getByRole('button', { name: 'Open Billing navigation' })
    )

    expect(screen.getByRole('heading', { name: 'Billing' })).toBeVisible()
    expect(screen.getByText('Island Commerce')).toBeVisible()
    expect(
      screen.getByRole('navigation', { name: 'Billing navigation' })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings'
    )
  })

  it('opens the active nested section and marks the child route active', async () => {
    const user = userEvent.setup()
    mocks.pathname = '/invoices/inv_123'
    renderNav()

    await user.click(
      screen.getByRole('button', { name: 'Open Billing navigation' })
    )

    expect(screen.getByRole('button', { name: /Sales/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Invoices' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Quotes' })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('expands and collapses nested navigation without closing the drawer', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(
      screen.getByRole('button', { name: 'Open Billing navigation' })
    )

    const sales = screen.getByRole('button', { name: /Sales/ })
    expect(sales).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Quotes' })).not.toBeInTheDocument()

    await user.click(sales)

    expect(sales).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Quotes' })).toBeVisible()
    expect(
      screen.getByRole('navigation', { name: 'Billing navigation' })
    ).toBeVisible()

    await user.click(sales)

    expect(sales).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Quotes' })).not.toBeInTheDocument()
  })

  it('closes the drawer after a route is selected', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(
      screen.getByRole('button', { name: 'Open Billing navigation' })
    )
    await user.click(screen.getByRole('link', { name: 'Settings' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('navigation', { name: 'Billing navigation' })
      ).not.toBeInTheDocument()
    )
  })
})
