/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { TooltipProvider } from '@876/ui/tooltip'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }))

vi.mock('next/navigation', () => ({ usePathname }))

import { navConfig } from '@/components/shell/nav-config'
import { Sidebar } from '@/components/shell/sidebar'

function renderSidebar(pathname: string) {
  usePathname.mockReturnValue(pathname)
  return render(
    <TooltipProvider>
      <Sidebar navigation={navConfig} />
    </TooltipProvider>
  )
}

function linkNames(): string[] {
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('aria-label') ?? link.textContent ?? '')
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('level 0 — the icon rail', () => {
    it('renders every top-level entry on a path that belongs to no section', () => {
      renderSidebar('/users')

      expect(
        screen.getByRole('navigation', { name: 'Console sections' })
      ).toBeVisible()
      expect(linkNames()).toEqual([
        'Dashboards',
        'Users',
        'Organizations',
        'Projects',
        'Requests',
        'Security',
        'Apps',
        'Widgets',
        'Storage',
        'Reports',
        'Settings',
      ])
    })

    it('marks the entry that owns the current path', () => {
      renderSidebar('/users/user_1')

      expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
        'aria-current',
        'page'
      )
      expect(screen.getByRole('link', { name: 'Apps' })).not.toHaveAttribute(
        'aria-current'
      )
    })

    it('offers no back control while the rail is showing', () => {
      renderSidebar('/users')

      expect(screen.queryByRole('button')).toBeNull()
    })

    it('keeps Settings a plain rail link that navigates straight through', async () => {
      renderSidebar('/settings')

      expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
        'href',
        '/settings'
      )
      // A section would have replaced the rail; Settings must not.
      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    })
  })

  describe('level 1 — an open section', () => {
    it('replaces the rail with the section items on a section route', () => {
      renderSidebar('/projects')

      expect(linkNames()).toEqual([
        'Overview',
        'Projects',
        'Issues',
        'Board',
        'Labels',
      ])
      expect(screen.queryByRole('link', { name: 'Storage' })).toBeNull()
    })

    it('opens from a nested route inside the section', () => {
      renderSidebar('/projects/issues/ISS-1')

      expect(screen.getByRole('link', { name: 'Issues' })).toBeInTheDocument()
    })

    it('marks the longest-matching item rather than the section index', () => {
      renderSidebar('/projects/issues')

      expect(screen.getByRole('link', { name: 'Issues' })).toHaveAttribute(
        'aria-current',
        'page'
      )
      expect(
        screen.getByRole('link', { name: 'Overview' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the index item marked on a record route it owns', () => {
      renderSidebar('/requests/req_1')

      expect(screen.getByRole('link', { name: 'Requests' })).toHaveAttribute(
        'aria-current',
        'page'
      )
      expect(
        screen.getByRole('link', { name: 'Customers' })
      ).not.toHaveAttribute('aria-current')
    })

    it('names the open section on its back control', () => {
      renderSidebar('/requests')

      expect(
        screen.getByRole('button', {
          name: 'Leave Requests and show all sections',
        })
      ).toBeVisible()
    })
  })

  describe('returning to the rail', () => {
    it('restores the rail when the back control is pressed, without navigating', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects/issues')

      await user.click(
        screen.getByRole('button', {
          name: 'Leave Projects and show all sections',
        })
      )

      expect(screen.getByRole('link', { name: 'Storage' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Board' })).toBeNull()
      // The rail entry still points at the section the operator is standing in.
      expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
        'aria-current',
        'page'
      )
    })

    it('reopens the section when its rail entry is clicked again', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects/issues')

      await user.click(
        screen.getByRole('button', {
          name: 'Leave Projects and show all sections',
        })
      )
      await user.click(screen.getByRole('link', { name: 'Projects' }))

      expect(screen.getByRole('link', { name: 'Board' })).toBeInTheDocument()
    })

    it('collapses on Escape', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects')

      await user.click(screen.getByRole('link', { name: 'Overview' }))
      await user.keyboard('{Escape}')

      expect(screen.getByRole('link', { name: 'Storage' })).toBeInTheDocument()
    })
  })
})
