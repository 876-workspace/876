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
  ListDetailShell: ({
    toolbar,
    list,
    detail,
  }: {
    toolbar: React.ReactNode
    list: React.ReactNode
    detail: React.ReactNode
  }) => (
    <div data-slot="split-shell">
      {toolbar}
      {list}
      {detail}
    </div>
  ),
  useListDetailRoute: () => ({ open: true }),
}))

import { RequestListDetailShell } from './request-list-detail-shell'

describe('RequestListDetailShell', () => {
  it('renders the list and detail in one split shell', () => {
    render(
      <RequestListDetailShell baseHref="/requests" list={<div>list</div>}>
        <div>detail</div>
      </RequestListDetailShell>
    )

    const shell = document.querySelector('[data-slot="split-shell"]')
    expect(shell).toHaveTextContent('list')
    expect(shell).toHaveTextContent('detail')
  })

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
