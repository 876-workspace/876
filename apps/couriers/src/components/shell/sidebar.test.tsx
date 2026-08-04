/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { SidebarProvider } from '@876/ui/sidebar'
import { beforeAll, describe, expect, it, vi } from 'vitest'

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
  usePathname: () => '/island-logistics',
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

function renderSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return render(
    <SidebarProvider>
      <Sidebar {...props} />
    </SidebarProvider>
  )
}

describe('Sidebar organization logo', () => {
  it('renders the organization logo when a public URL is provided', () => {
    const logoUrl = 'https://assets.876.test/island.png'

    const { container } = renderSidebar({
      basePath: '/island-logistics',
      tenantName: 'Island Logistics',
      logoUrl,
    })

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', logoUrl)
    // OrgAvatar uses decorative empty alt; the org name is in the adjacent label.
    expect(img).toHaveAttribute('alt', '')
    expect(
      screen.getByRole('link', { name: /Island Logistics/i })
    ).toHaveAttribute('href', '/island-logistics')
  })

  it('falls back to initials when no logo URL is provided', () => {
    const { container } = renderSidebar({
      basePath: '/island-logistics',
      tenantName: 'Island Logistics',
      logoUrl: null,
    })

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Island Logistics')).toBeInTheDocument()
    // Monogram fallback uses initials from the tenant name
    expect(screen.getByText('IL')).toBeInTheDocument()
  })

  it('treats a missing logoUrl prop the same as null', () => {
    const { container } = renderSidebar({
      basePath: '/montego-express',
      tenantName: 'Montego Express',
    })

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Montego Express')).toBeInTheDocument()
  })
})

describe('Sidebar navigation', () => {
  it('renders the grouped navigation without visible group labels', () => {
    renderSidebar({
      basePath: '/island-logistics',
      tenantName: 'Island Logistics',
    })

    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Warehouse' })).toHaveAttribute(
      'href',
      '/island-logistics/warehouse'
    )
    expect(screen.getByRole('link', { name: 'Deliveries' })).toHaveAttribute(
      'href',
      '/island-logistics/deliveries'
    )
    expect(screen.getByRole('link', { name: 'Documents' })).toHaveAttribute(
      'href',
      '/island-logistics/documents'
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/island-logistics/settings'
    )
    expect(screen.getByRole('button', { name: 'Transactions' })).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Transactions' })
    ).not.toBeInTheDocument()
  })
})
