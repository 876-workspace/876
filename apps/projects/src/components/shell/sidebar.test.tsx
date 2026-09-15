import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NavGroupDefinition } from '@876/core/access'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects',
}))

import { Sidebar } from './sidebar'
import { SidebarProvider, SidebarTrigger } from '@876/ui/sidebar'

const navigation: NavGroupDefinition[] = [
  {
    key: 'workspace',
    entries: [
      {
        key: 'projects',
        title: 'Projects',
        href: '/projects',
        icon: 'projects',
      },
      { key: 'issues', title: 'Issues', href: '/issues', icon: 'issues' },
      { key: 'board', title: 'Board', href: '/board', icon: 'board' },
      { key: 'labels', title: 'Labels', href: '/labels', icon: 'labels' },
    ],
  },
]

function renderSidebar(defaultOpen = true) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar navigation={navigation} />
      <SidebarTrigger />
    </SidebarProvider>
  )
}

afterEach(cleanup)

describe('Projects Sidebar', () => {
  it('renders the docked sidebar expanded with labels by default', () => {
    renderSidebar()

    const nav = screen.getByRole('navigation', { name: 'Projects navigation' })

    expect(within(nav).getByText('Issues')).toBeInTheDocument()
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
  })

  it('links every entry to its configured href', () => {
    renderSidebar()

    const nav = screen.getByRole('navigation', { name: 'Projects navigation' })

    expect(within(nav).getByRole('link', { name: 'Board' })).toHaveAttribute(
      'href',
      '/board'
    )
  })

  it('marks the current path as the current page', () => {
    renderSidebar()

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('hides labels when the sidebar starts collapsed to icons', () => {
    renderSidebar(false)

    const nav = screen.getByRole('navigation', { name: 'Projects navigation' })

    expect(within(nav).queryByText('Issues')).toBeNull()
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
  })

  it('collapses to icons when the trigger is pressed', async () => {
    const user = userEvent.setup()
    renderSidebar()

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    const nav = screen.getByRole('navigation', { name: 'Projects navigation' })
    expect(within(nav).queryByText('Issues')).toBeNull()
  })

  it('resolves a distinct rendered glyph for every Projects entry', () => {
    renderSidebar()

    const nav = screen.getByRole('navigation', { name: 'Projects navigation' })
    const glyphs = within(nav)
      .getAllByRole('link')
      .map((link) =>
        Array.from(link.querySelectorAll('path'))
          .map((path) => path.getAttribute('d'))
          .join('|')
      )

    expect(new Set(glyphs).size).toBe(glyphs.length)
  })
})
