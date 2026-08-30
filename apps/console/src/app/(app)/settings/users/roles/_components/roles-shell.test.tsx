// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { RolesShell } from './roles-shell'

const mocks = vi.hoisted(() => ({ segments: [] as string[] }))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/settings/users/roles',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

function renderShell() {
  render(
    <RolesShell list={<div>Roles list</div>}>
      <div>Role card</div>
    </RolesShell>
  )
}

describe('RolesShell', () => {
  beforeEach(() => {
    mocks.segments = []
  })

  it('keeps the toolbar mounted with its Add action while a role is open', () => {
    mocks.segments = ['admin']
    renderShell()

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/settings/users/roles/new'
    )
  })

  it('opens the role card beside the list stack in the same row', () => {
    mocks.segments = ['admin']
    renderShell()
    const detailCell = screen.getByText('Role card').parentElement!

    expect(detailCell.className).toContain('@3xl/list-detail:col-start-2')
    expect(detailCell.className).toContain('@3xl/list-detail:row-start-1')
  })

  it('narrows the list column once a role is open', () => {
    mocks.segments = ['admin']
    renderShell()
    const shell = document.querySelector('[data-slot="list-detail-shell"]')!

    expect(shell).toHaveAttribute('data-state', 'open')
    expect(shell.firstElementChild!.className).toContain(
      '@3xl/list-detail:grid-cols-[18rem_minmax(0,1fr)]'
    )
  })

  it('gives the list the full width when no role is open', () => {
    renderShell()
    const shell = document.querySelector('[data-slot="list-detail-shell"]')!

    expect(shell).toHaveAttribute('data-state', 'closed')
    expect(shell.firstElementChild!.className).toContain(
      '@3xl/list-detail:grid-cols-[minmax(0,1fr)_0fr]'
    )
  })

  it('opens the create route in the card slot rather than taking over', () => {
    mocks.segments = ['new']
    renderShell()

    expect(screen.getByText('Roles list')).toBeInTheDocument()
    expect(screen.getByText('Role card')).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="list-detail-shell"]')
    ).toHaveAttribute('data-state', 'open')
  })

  it('stays closed on the index route wrapped in a route group', () => {
    mocks.segments = ['(list)']
    renderShell()

    expect(
      document.querySelector('[data-slot="list-detail-shell"]')
    ).toHaveAttribute('data-state', 'closed')
  })
})
