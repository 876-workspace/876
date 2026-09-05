import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Sidebar, SidebarProvider } from './sidebar'

function fixedFloatingGaps(gutter: number) {
  const cardEnd = 256 - gutter
  const pageContentStart = 256

  return {
    windowToCard: gutter,
    cardToContent: pageContentStart - cardEnd,
    contentToWindow: gutter,
  }
}

function collapsedFloatingGaps(gutter: number) {
  const cardEnd = 60 + gutter + 2
  const pageContentStart = 60 + 2 * gutter + 2

  return {
    windowToCard: gutter,
    cardToContent: pageContentStart - cardEnd,
    contentToWindow: gutter,
  }
}

describe('floating Sidebar spacing', () => {
  it('resolves the fixed card and spacer to one horizontal gutter at every breakpoint', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar variant="floating" collapsible="icon">
          <div>Navigation</div>
        </Sidebar>
      </SidebarProvider>
    )

    const spacer = container.querySelector<HTMLElement>(
      '[data-slot="sidebar-gap"]'
    )
    const fixedSidebar = container.querySelector<HTMLElement>(
      '[data-slot="sidebar-container"]'
    )

    expect(spacer).toHaveClass(
      'w-[calc(var(--sidebar-width)-var(--876-shell-gutter))]'
    )
    expect(spacer).toHaveClass(
      'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--876-shell-gutter)+2px)]'
    )
    expect(fixedSidebar).toHaveClass('px-[var(--876-shell-gutter)]')

    for (const gutter of [16, 24, 32]) {
      expect(fixedFloatingGaps(gutter)).toEqual({
        windowToCard: gutter,
        cardToContent: gutter,
        contentToWindow: gutter,
      })
      expect(collapsedFloatingGaps(gutter)).toEqual({
        windowToCard: gutter,
        cardToContent: gutter,
        contentToWindow: gutter,
      })
    }
  })

  it('keeps the floating variant vertical padding at p-2', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar variant="floating" collapsible="icon">
          <div>Navigation</div>
        </Sidebar>
      </SidebarProvider>
    )

    const fixedSidebar = container.querySelector<HTMLElement>(
      '[data-slot="sidebar-container"]'
    )

    expect(fixedSidebar).toHaveClass('py-2')
    expect(fixedSidebar?.className).not.toContain('p-[var(--876-shell-gutter)]')
  })
})
