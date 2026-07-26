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
  usePathname: () => '/org/island-logistics',
}))

import { CouriersSidebar } from './couriers-sidebar'

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

function renderSidebar(
  props: React.ComponentProps<typeof CouriersSidebar>
) {
  return render(
    <SidebarProvider>
      <CouriersSidebar {...props} />
    </SidebarProvider>
  )
}

describe('CouriersSidebar organization logo', () => {
  it('renders the organization logo when a public URL is provided', () => {
    const logoUrl = 'https://assets.876.test/island.png'

    const { container } = renderSidebar({
      basePath: '/org/island-logistics',
      tenantName: 'Island Logistics',
      logoUrl,
    })

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', logoUrl)
    // OrgAvatar uses decorative empty alt; the org name is in the adjacent label.
    expect(img).toHaveAttribute('alt', '')
    expect(
      screen.getByRole('link', { name: /Island Logistics/i })
    ).toHaveAttribute('href', '/org/island-logistics')
  })

  it('falls back to initials when no logo URL is provided', () => {
    const { container } = renderSidebar({
      basePath: '/org/island-logistics',
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
      basePath: '/org/montego-express',
      tenantName: 'Montego Express',
    })

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Montego Express')).toBeInTheDocument()
  })
})
