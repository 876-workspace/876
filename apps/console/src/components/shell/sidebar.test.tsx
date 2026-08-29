/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./nav-link', () => ({
  NavLink: ({ href, title }: { href: string; title: string }) => (
    <a href={href}>{title}</a>
  ),
}))

import { Sidebar } from '@/components/shell/sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders console navigation without the former account-menu footer', () => {
    render(<Sidebar />)

    expect(
      screen.getByRole('navigation', { name: 'Console sections' })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings'
    )
    expect(screen.queryByLabelText('Open account menu')).toBeNull()
  })
})
