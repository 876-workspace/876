/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { TooltipProvider } from '@876/ui/tooltip'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }))

vi.mock('next/navigation', () => ({ usePathname }))

import { navConfig } from '@/components/shell/nav-config'
import { navContexts } from '@/components/shell/nav-contexts'
import { Sidebar } from '@/components/shell/sidebar'
import type { SidebarSlot } from '@/components/shell/sidebar-slots'

function renderSidebar(pathname: string, slots: SidebarSlot[] = []) {
  usePathname.mockReturnValue(pathname)
  return render(
    <TooltipProvider>
      <Sidebar navigation={navConfig} contexts={navContexts} slots={slots} />
    </TooltipProvider>
  )
}

function linkNames(): string[] {
  return screen
    .queryAllByRole('link')
    .map((link) => link.getAttribute('aria-label') ?? link.textContent ?? '')
}

function backControl(name: string) {
  return screen.getByRole('button', { name })
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('the platform context', () => {
    it('renders every top-level entry on a path no context claims', () => {
      renderSidebar('/users')

      expect(
        screen.getByRole('navigation', { name: 'Console navigation' })
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

    it('offers no back control at the root', () => {
      renderSidebar('/users')

      expect(screen.queryByRole('button', { name: /^Back to/ })).toBeNull()
    })

    it('keeps Settings a plain rail link that navigates straight through', () => {
      renderSidebar('/settings')

      expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
        'href',
        '/settings'
      )
      // A context would have replaced the rail; Settings must not.
      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    })
  })

  describe('an open context', () => {
    it('replaces the rail with the context items on a context route', () => {
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

    it('stays collapsed rather than widening to show labels', () => {
      renderSidebar('/projects')

      // Collapsed means icons plus tooltips: the label is the accessible name,
      // never rendered text beside the icon.
      expect(screen.getByRole('link', { name: 'Issues' })).toHaveTextContent('')
      expect(
        screen.getByRole('button', { name: 'Expand sidebar' })
      ).toBeVisible()
    })

    it('opens from a nested route inside the context', () => {
      renderSidebar('/projects/issues/ISS-1')

      expect(screen.getByRole('link', { name: 'Issues' })).toBeInTheDocument()
    })

    it('marks the longest-matching item rather than the context index', () => {
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

    it('names the level the back control actually returns to', () => {
      renderSidebar('/requests')

      expect(backControl('Back to Console')).toBeVisible()
    })
  })

  describe('a context with nothing in it yet', () => {
    it('swaps the rail for Storage even though it has no entries', () => {
      renderSidebar('/storage')

      expect(linkNames()).toEqual([])
      expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
    })

    it('still offers the way back out', () => {
      renderSidebar('/storage')

      expect(backControl('Back to Console')).toBeVisible()
    })
  })

  describe('returning to the previous context', () => {
    it('restores the parent when back is pressed, without navigating', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects/issues')

      await user.click(backControl('Back to Console'))

      expect(screen.getByRole('link', { name: 'Storage' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Board' })).toBeNull()
      // The rail entry still points at the context the operator stands in.
      expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
        'aria-current',
        'page'
      )
    })

    it('reopens the context when its rail entry is followed again', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects/issues')

      await user.click(backControl('Back to Console'))
      await user.click(screen.getByRole('link', { name: 'Projects' }))

      expect(screen.getByRole('link', { name: 'Board' })).toBeInTheDocument()
    })

    it('reopens an entry-less context, which has no children to read', async () => {
      const user = userEvent.setup()
      renderSidebar('/storage')

      await user.click(backControl('Back to Console'))
      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: 'Storage' }))
      expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
      expect(backControl('Back to Console')).toBeVisible()
    })

    it('returns to the parent on Escape', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects')

      await user.click(screen.getByRole('link', { name: 'Overview' }))
      await user.keyboard('{Escape}')

      expect(screen.getByRole('link', { name: 'Storage' })).toBeInTheDocument()
    })
  })

  describe('expanding to show labels', () => {
    it('is collapsed until the operator asks otherwise', () => {
      renderSidebar('/users')

      expect(
        screen.getByRole('button', { name: 'Expand sidebar' })
      ).toHaveAttribute('aria-expanded', 'false')
    })

    it('reveals the entry titles beside their icons', async () => {
      const user = userEvent.setup()
      renderSidebar('/users')

      await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

      expect(screen.getByRole('link', { name: 'Users' })).toHaveTextContent(
        'Users'
      )
      expect(
        screen.getByRole('button', { name: 'Collapse sidebar' })
      ).toHaveAttribute('aria-expanded', 'true')
    })

    it('persists the choice so it survives the next navigation', async () => {
      const user = userEvent.setup()
      const view = renderSidebar('/users')

      await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))
      view.unmount()
      renderSidebar('/projects')

      expect(screen.getByRole('link', { name: 'Issues' })).toHaveTextContent(
        'Issues'
      )
    })

    it('collapses again on a second press', async () => {
      const user = userEvent.setup()
      renderSidebar('/users')

      await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))
      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

      expect(screen.getByRole('link', { name: 'Users' })).toHaveTextContent('')
    })

    it('is a separate control from back, at every level', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects')

      await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

      expect(backControl('Back to Console')).toBeVisible()
      expect(
        screen.getByRole('button', { name: 'Collapse sidebar' })
      ).toBeVisible()
    })
  })

  describe('slots', () => {
    const slot: SidebarSlot = {
      key: 'announcement',
      region: 'footer',
      title: 'What is new',
      icon: 'reports',
      componentKey: 'not-registered',
    }

    it('renders nothing for a component key the shell does not know', () => {
      renderSidebar('/users', [slot])

      expect(screen.queryByText('What is new')).toBeNull()
    })

    it('leaves the navigation intact when a slot cannot render', () => {
      renderSidebar('/users', [slot])

      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    })
  })
})
