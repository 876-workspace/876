/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/board',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/auth/require-projects-context', () => ({
  requireAppPermission: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/features/projects/components/board-data', () => ({
  BoardData: () => <div>Board data</div>,
}))

import BoardPage from './page'

describe('BoardPage', () => {
  it('renders the standard toolbar with Add and disabled transfer actions', async () => {
    const user = userEvent.setup()
    render(await BoardPage())
    await user.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'All Board Issues' })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('menuitem', { name: 'Refresh' })
    ).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/issues/new'
    )
  })
})
