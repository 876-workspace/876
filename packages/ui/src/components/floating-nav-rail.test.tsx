import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from './tooltip'
import { FloatingNavRail, FloatingNavRailToggle } from './floating-nav-rail'

function renderRail(expanded: boolean) {
  return render(
    <TooltipProvider>
      <FloatingNavRail expanded={expanded} aria-label="Test navigation">
        <span>Navigation</span>
      </FloatingNavRail>
    </TooltipProvider>
  )
}

describe('FloatingNavRail', () => {
  it('renders the compact width when collapsed', () => {
    renderRail(false)

    const rail = screen.getByRole('navigation', { name: 'Test navigation' })

    expect(rail).toHaveAttribute('data-state', 'collapsed')
    expect(rail).toHaveClass('w-[3.75rem]')
    expect(rail).not.toHaveClass('w-56')
  })

  it('renders the panel width when expanded', () => {
    renderRail(true)

    const rail = screen.getByRole('navigation', { name: 'Test navigation' })

    expect(rail).toHaveAttribute('data-state', 'expanded')
    expect(rail).toHaveClass('w-56')
    expect(rail).not.toHaveClass('w-[3.75rem]')
  })

  it('keeps caller content and the shell gutter inside the shared primitive', () => {
    const { container } = renderRail(false)

    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="floating-nav-rail-area"]')
    ).toHaveClass('pl-[var(--876-shell-gutter)]')
  })

  it('notifies the consumer when its presentation toggle is pressed', async () => {
    const user = userEvent.setup()
    const onExpandedChange = vi.fn()

    render(
      <TooltipProvider>
        <FloatingNavRailToggle
          expanded={false}
          onExpandedChange={onExpandedChange}
        />
      </TooltipProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(onExpandedChange).toHaveBeenCalledTimes(1)
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })
})
