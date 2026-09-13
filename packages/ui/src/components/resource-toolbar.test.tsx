import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import { ResourceToolbar } from './resource-toolbar'

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

async function openActions() {
  const triggers = screen.getAllByRole('button', { name: 'More actions' })
  await userEvent.setup().click(triggers[triggers.length - 1])
  await screen.findByRole('menu')
}

describe('ResourceToolbar', () => {
  beforeEach(() => {
    cleanup()
    mocks.refresh.mockReset()
  })

  it('renders the primary action', () => {
    render(<ResourceToolbar title="Customers" primaryLabel="Add" />)

    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('keeps an accessible primary action when icon-only', () => {
    render(
      <ResourceToolbar title="Customers" primaryLabel="Add" primaryIconOnly />
    )

    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('renders Refresh first', async () => {
    render(
      <ResourceToolbar
        title="Customers"
        refresh
        dropdownActions={[{ label: 'Import', icon: 'import' }]}
      />
    )
    await openActions()

    expect(screen.getAllByRole('menuitem')[0]).toHaveTextContent('Refresh')
  })

  it('refreshes through the router', async () => {
    render(<ResourceToolbar title="Customers" refresh />)
    await openActions()
    await userEvent
      .setup()
      .click(screen.getByRole('menuitem', { name: 'Refresh' }))

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('separates Refresh from supplied actions', async () => {
    render(
      <ResourceToolbar
        title="Customers"
        refresh
        dropdownActions={[{ label: 'Import', icon: 'import' }]}
      />
    )
    await openActions()

    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('renders unavailable imports and exports as disabled', async () => {
    render(
      <ResourceToolbar
        title="Customers"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import', disabled: true },
          { label: 'Export', icon: 'export', disabled: true },
        ]}
      />
    )
    await openActions()

    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'data-disabled'
    )
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'data-disabled'
    )
  })
})
