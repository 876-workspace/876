/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Users } from '@876/ui/icons'
import { TooltipProvider } from '@876/ui/tooltip'

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }))

vi.mock('next/navigation', () => ({ usePathname }))

import { NavLink, isActiveConsolePath } from './nav-link'

const TINT = 'bg-amber-500/12 ring-amber-500/30'

function renderLink(
  pathname: string,
  props: Partial<Parameters<typeof NavLink>[0]> = {}
) {
  usePathname.mockReturnValue(pathname)
  render(
    <TooltipProvider>
      <NavLink
        href="/users"
        title="Users"
        icon={Users}
        activeClassName={TINT}
        {...props}
      />
    </TooltipProvider>
  )
  return screen.getByRole('link', { name: 'Users' })
}

describe('NavLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('active tile', () => {
    it("applies the entry's tint when the route is active", () => {
      const link = renderLink('/users')

      expect(link).toHaveClass('bg-amber-500/12', 'ring-amber-500/30')
      expect(link).toHaveAttribute('aria-current', 'page')
    })

    it("applies the entry's tint on a nested route of the entry", () => {
      const link = renderLink('/users/user_1')

      expect(link).toHaveClass('bg-amber-500/12')
    })

    it('withholds the tint when the route is not active', () => {
      const link = renderLink('/orgs')

      expect(link).not.toHaveClass('bg-amber-500/12')
      expect(link).toHaveClass('text-muted-foreground')
      expect(link).not.toHaveAttribute('aria-current')
    })

    it('falls back to the neutral tint when the entry declares none', () => {
      const link = renderLink('/users', { activeClassName: undefined })

      expect(link).toHaveClass('bg-[var(--876-nav-active-bg)]')
      expect(link).not.toHaveClass('bg-amber-500/12')
    })

    it('keeps the rounded tile shape on both states', () => {
      const active = renderLink('/users')

      expect(active).toHaveClass('rounded-xl')
    })
  })

  describe('isActiveConsolePath', () => {
    it('matches the dashboard on both root and /dashboard', () => {
      expect(isActiveConsolePath('/', '/')).toBe(true)
      expect(isActiveConsolePath('/dashboard/overview', '/')).toBe(true)
    })

    it('does not match an unrelated route against the dashboard', () => {
      expect(isActiveConsolePath('/users', '/')).toBe(false)
    })

    it('matches a nested route but not a sibling with a shared prefix', () => {
      expect(isActiveConsolePath('/users/user_1', '/users')).toBe(true)
      expect(isActiveConsolePath('/users-archive', '/users')).toBe(false)
    })

    it('never matches a placeholder href', () => {
      expect(isActiveConsolePath('#', '#')).toBe(false)
    })
  })
})
