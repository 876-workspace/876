/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@876/ui/sidebar', () => ({
  Sidebar: (
    props: ComponentPropsWithoutRef<'aside'> & {
      children: ReactNode
      collapsible?: string
    }
  ) => {
    const { children, collapsible, ...rest } = props
    void collapsible
    return <aside {...rest}>{children}</aside>
  },
  SidebarContent: (props: ComponentPropsWithoutRef<'div'>) => (
    <div {...props} />
  ),
  SidebarGroup: (props: ComponentPropsWithoutRef<'section'>) => (
    <section {...props} />
  ),
  SidebarGroupLabel: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 {...props} />
  ),
  SidebarHeader: (props: ComponentPropsWithoutRef<'header'>) => (
    <header {...props} />
  ),
}))

vi.mock('./console-nav-dropdown', () => ({
  ConsoleNavDropdown: ({ item }: { item: { title: string; href: string } }) => (
    <a href={item.href}>{item.title}</a>
  ),
}))

vi.mock('./console-nav-link', () => ({
  ConsoleNavLink: ({ href, title }: { href: string; title: string }) => (
    <a href={href}>{title}</a>
  ),
}))

import { ConsoleSidebar } from './console-sidebar'

describe('ConsoleSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders console navigation without the former account-menu footer', () => {
    render(<ConsoleSidebar />)

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
