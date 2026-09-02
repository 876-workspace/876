/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: () => false,
}))

import OverviewLoading from '@/app/(app)/(overview)/loading'
import ReportsLoading from '@/app/(app)/reports/loading'
import SettingsLoading from '@/app/(app)/settings/(list)/loading'

/**
 * Route-level fallbacks for the sections that are *not* list/detail splits.
 *
 * A split section owns its own Suspense boundary in its layout, around the list
 * alone — so it must not also carry a `(list)/loading.tsx`. That file wraps the
 * `(list)` page, which in a split section renders nothing, and its toolbar and
 * table would paint into the detail column on top of the real toolbar and list
 * the layout already renders. The sections below have no split, so a
 * route-level fallback is still theirs to own.
 */
describe('route loading fallbacks', () => {
  it('reports falls back to shape-matched cards, not a table', () => {
    const { container } = render(<ReportsLoading />)

    expect(container.textContent).toContain('Reports')
    expect(container.querySelectorAll('[class~="876-card"]')).toHaveLength(2)
    expect(container.querySelector('table')).toBeNull()
  })

  it('settings keeps its real hub heading and skeletons no cards', () => {
    const { container } = render(<SettingsLoading />)

    expect(container.textContent).toContain('Settings')
    expect(container.querySelectorAll('[class~="876-card"]')).toHaveLength(0)
    expect(container.querySelector('table')).toBeNull()
  })

  it('the overview falls back without any interactive control', () => {
    const { container } = render(<OverviewLoading />)

    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length
    ).toBeGreaterThan(0)
  })

  it('no split-view section carries a route-level list fallback', async () => {
    const { readdir } = await import('node:fs/promises')
    const { join } = await import('node:path')

    const appDir = join(process.cwd(), 'src/app/(app)')
    const found: string[] = []

    async function walk(dir: string) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) await walk(full)
        else if (entry.name.endsWith('-section.tsx')) found.push(full)
      }
    }
    await walk(appDir)

    // Every `*-section.tsx` marks a split section; its sibling `(list)` must
    // not own a `loading.tsx`.
    for (const section of found) {
      const sectionRoot = section.replace(/\/_components\/[^/]+$/, '')
      const listDir = join(sectionRoot, '(list)')
      const entries = await readdir(listDir).catch(() => [])
      expect({ section: sectionRoot, entries }).toEqual({
        section: sectionRoot,
        entries: entries.filter((name) => name !== 'loading.tsx'),
      })
    }

    expect(found.length).toBeGreaterThan(10)
  })
})
