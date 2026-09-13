/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/requests',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@876/ui/list-detail-shell', () => ({
  ListDetailShell: ({ toolbar }: { toolbar: React.ReactNode }) => toolbar,
  useListDetailRoute: () => ({ open: true }),
}))

import { RequestListDetailShell } from './request-list-detail-shell'

describe('RequestListDetailShell', () => {
  it('keeps Add and the standard actions visible beside an open request', async () => {
    const user = userEvent.setup()
    render(
      <RequestListDetailShell baseHref="/requests" list={null} canCreate>
        detail
      </RequestListDetailShell>
    )
    await user.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'All Requests' })
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
      '/requests/new'
    )
  })
})
