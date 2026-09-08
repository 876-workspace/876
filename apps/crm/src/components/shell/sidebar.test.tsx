import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'

const mocks = vi.hoisted(() => ({ navLink: vi.fn() }))

vi.mock('./nav-link', () => ({
  NavLink: (props: Record<string, unknown>) => {
    mocks.navLink(props)
    return <a href={String(props.href)}>{String(props.title)}</a>
  },
}))

import { Sidebar } from './sidebar'

const navigation: NavGroupDefinition[] = [
  {
    key: 'workspace',
    entries: [
      {
        key: 'dashboard',
        title: 'Dashboard',
        href: '/',
        icon: 'dashboard',
      },
    ],
  },
  {
    key: 'settings',
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

describe('CRM Sidebar', () => {
  it('keeps a floating desktop rail and removes the horizontal mobile strip', () => {
    render(<Sidebar navigation={navigation} />)

    const sidebar = screen.getByRole('complementary', { name: 'CRM sections' })

    expect(sidebar).toHaveClass('hidden', 'md:flex')
    expect(sidebar.className).not.toContain('sm:flex')
    expect(
      screen.queryByRole('navigation', { name: 'CRM mobile sections' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/'
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings'
    )
    expect(mocks.navLink).toHaveBeenCalledTimes(2)
  })
})
