import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NavGroupDefinition } from '@876/core/access'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects',
}))

import { Sidebar } from './sidebar'
import { SIDEBAR_EXPANDED_STORAGE_KEY } from './sidebar-preferences'

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

beforeEach(() => {
  localStorage.clear()
})

afterEach(cleanup)

describe('Projects Sidebar', () => {
  it('defaults to the compact icon rail', () => {
    render(<Sidebar navigation={navigation} />)

    expect(
      screen.getByRole('button', { name: 'Expand sidebar' })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not render navigation labels while the rail is collapsed', () => {
    render(<Sidebar navigation={navigation} />)

    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    expect(screen.queryByText('Issues')).not.toBeInTheDocument()
  })

  it('expands the rail when the control is pressed', async () => {
    const user = userEvent.setup()
    render(<Sidebar navigation={navigation} />)

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(
      screen.getByRole('button', { name: 'Collapse sidebar' })
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders navigation labels only after expansion', async () => {
    const user = userEvent.setup()
    render(<Sidebar navigation={navigation} />)

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Issues')).toBeInTheDocument()
  })

  it('persists the expanded preference when the rail opens', async () => {
    const user = userEvent.setup()
    render(<Sidebar navigation={navigation} />)

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)).toBe('true')
  })

  it('restores an expanded rail from the persisted preference', () => {
    localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, 'true')
    render(<Sidebar navigation={navigation} />)

    expect(screen.getByText('Board')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Collapse sidebar' })
    ).toBeInTheDocument()
  })

  it('resolves a distinct rendered glyph for every Projects rail entry', () => {
    render(<Sidebar navigation={navigation} />)

    const rail = screen.getByRole('navigation', { name: 'Projects navigation' })
    const glyphs = within(rail)
      .getAllByRole('link')
      .map((link) =>
        Array.from(link.querySelectorAll('path'))
          .map((path) => path.getAttribute('d'))
          .join('|')
      )

    expect(new Set(glyphs).size).toBe(glyphs.length)
  })
})
