/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { SidebarProvider, SidebarTrigger } from '@876/ui/sidebar'
import { TooltipProvider } from '@876/ui/tooltip'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }))

vi.mock('next/navigation', () => ({ usePathname }))

import { navConfig } from '@/components/shell/nav-config'
import { navContexts } from '@/components/shell/nav-contexts'
import { Sidebar } from '@/components/shell/sidebar'
import { sidebarContexts } from '@/components/shell/sidebar-context'
import type { SidebarSlot } from '@/components/shell/sidebar-slots'

function renderSidebar(
  pathname: string,
  slots: SidebarSlot[] = [],
  defaultOpen = true
) {
  usePathname.mockReturnValue(pathname)

  return render(
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SidebarTrigger />
        <Sidebar navigation={navConfig} contexts={navContexts} slots={slots} />
      </SidebarProvider>
    </TooltipProvider>
  )
}

function navigation() {
  return screen.getByRole('navigation', { name: 'Console navigation' })
}

function linkNames(): string[] {
  return within(navigation())
    .queryAllByRole('link')
    .map((link) => link.getAttribute('aria-label') ?? link.textContent ?? '')
}

function backControl(name: string) {
  return screen.getByRole('button', { name })
}

function sidebarRoot() {
  return document.querySelector<HTMLElement>(
    '[data-slot="sidebar"][data-variant="sidebar"]'
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('the standard sidebar shell', () => {
    it('uses the docked sidebar variant with icon collapse support', () => {
      renderSidebar('/users')

      const sidebar = sidebarRoot()
      const gap = document.querySelector<HTMLElement>('[data-slot="sidebar-gap"]')

      expect(sidebar).toHaveAttribute('data-variant', 'sidebar')
      expect(sidebar).toHaveAttribute('data-state', 'expanded')
      expect(gap).toHaveClass('group-data-[collapsible=icon]:w-(--sidebar-width-icon)')
      expect(gap?.className).not.toContain(
        'w-[calc(var(--sidebar-width)-var(--876-shell-gutter))]'
      )
    })

    it('renders the Console identity in the root sidebar header', () => {
      renderSidebar('/users')

      expect(screen.getByRole('link', { name: 'Console home' })).toHaveAttribute(
        'href',
        '/'
      )
      expect(screen.getByRole('link', { name: 'Console home' })).toHaveTextContent(
        'Console'
      )
    })

    it('renders expanded entry labels by default', () => {
      renderSidebar('/users')

      expect(screen.getByRole('link', { name: 'Users' })).toHaveTextContent(
        'Users'
      )
    })

    it('renders icon-only entries when the shared provider starts collapsed', () => {
      renderSidebar('/users', [], false)

      expect(sidebarRoot()).toHaveAttribute('data-state', 'collapsed')
      expect(screen.getByRole('link', { name: 'Users' })).toHaveTextContent('')
    })

    it('lets the shared sidebar trigger change presentation state', async () => {
      const user = userEvent.setup()
      renderSidebar('/users')

      await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

      expect(sidebarRoot()).toHaveAttribute('data-state', 'collapsed')
      expect(screen.getByRole('link', { name: 'Users' })).toHaveTextContent('')
    })
  })

  describe('the platform context', () => {
    it('renders every top-level entry on a path no context claims', () => {
      renderSidebar('/users')

      expect(navigation()).toBeVisible()
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

    it('offers no context back control at the root', () => {
      renderSidebar('/users')

      expect(screen.queryByRole('button', { name: /^Back to/ })).toBeNull()
    })

    it('keeps Settings a plain link that does not replace the context', () => {
      renderSidebar('/settings')

      expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
        'href',
        '/settings'
      )
      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    })
  })

  describe('an open context', () => {
    it('replaces root navigation with the context items', () => {
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

    it('keeps back separate from the shared collapse trigger', () => {
      renderSidebar('/projects')

      expect(backControl('Back to Console')).toBeVisible()
      expect(
        screen.getByRole('button', { name: 'Toggle Sidebar' })
      ).toBeVisible()
    })

    it('gives every registered context a non-empty back-control name', () => {
      const contexts = sidebarContexts(navConfig, navContexts)

      for (const context of contexts) {
        if (context.parentKey === null) continue

        const parent = contexts.find((item) => item.key === context.parentKey)
        const label = `Back to ${parent?.backLabel ?? ''}`
        const view = renderSidebar(context.href)

        expect(label).not.toBe('Back to ')
        expect(screen.getByRole('button', { name: label })).toBeVisible()

        view.unmount()
      }
    })
  })

  describe('a context with nothing in it yet', () => {
    it('swaps navigation for Storage even though it has no entries', () => {
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
    it('restores the parent when back is pressed without navigating', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects/issues')

      await user.click(backControl('Back to Console'))

      expect(screen.getByRole('link', { name: 'Storage' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Board' })).toBeNull()
      expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
        'aria-current',
        'page'
      )
    })

    it('reopens the context when its root entry is followed again', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects/issues')

      await user.click(backControl('Back to Console'))
      await user.click(screen.getByRole('link', { name: 'Projects' }))

      expect(screen.getByRole('link', { name: 'Board' })).toBeInTheDocument()
    })

    it('reopens an entry-less context that has no children to inspect', async () => {
      const user = userEvent.setup()
      renderSidebar('/storage')

      await user.click(backControl('Back to Console'))
      await user.click(screen.getByRole('link', { name: 'Storage' }))

      expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
      expect(backControl('Back to Console')).toBeVisible()
    })

    it('returns to the parent context on Escape', async () => {
      const user = userEvent.setup()
      renderSidebar('/projects')

      await user.click(screen.getByRole('link', { name: 'Overview' }))
      await user.keyboard('{Escape}')

      expect(screen.getByRole('link', { name: 'Storage' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Board' })).toBeNull()
    })
  })

  describe('entry presentation', () => {
    it('never bolds an expanded entry label, active or not', () => {
      renderSidebar('/users')

      const usersLink = screen.getByRole('link', { name: 'Users' })

      expect(usersLink.className).not.toMatch(/font-(?:medium|semibold|bold)/)
    })

    it('colors a context entry from its icon when the entry declares none', () => {
      renderSidebar('/projects/issues')

      const board = screen.getByRole('link', { name: 'Board' })
      const icon = board.querySelector('svg')

      expect(icon?.className.baseVal ?? '').toMatch(/text-violet-500/)
    })

    it('keeps an entry-declared color ahead of the contextual fallback', () => {
      renderSidebar('/users')

      const users = screen.getByRole('link', { name: 'Users' })
      const icon = users.querySelector('svg')

      expect(icon?.className.baseVal ?? '').toMatch(/text-amber-500/)
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

    it('leaves navigation intact when a slot cannot render', () => {
      renderSidebar('/users', [slot])

      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    })
  })
})
