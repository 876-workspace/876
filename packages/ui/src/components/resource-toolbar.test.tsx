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
  await userEvent.setup().click(
    screen.getByRole('button', { name: 'More actions' })
  )
  await screen.findByRole('menu')
}

describe('ResourceToolbar', () => {
  beforeEach(() => {
    cleanup()
    mocks.refresh.mockReset()
  })

  it('renders the title once', () => {
    render(<ResourceToolbar title="Customers" />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Customers'
    )
  })

  it('renders the filter heading as the only h1', () => {
    render(
      <ResourceToolbar
        title="Customers"
        titleFilter={<h1 className="876-page-title">Open ⌄</h1>}
      />
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Open ⌄' })).toHaveClass(
      '876-page-title'
    )
  })

  it('gives the title wrapper the responsive large-title class', () => {
    render(<ResourceToolbar title="Customers" />)

    expect(screen.getByRole('heading', { level: 1 }).className).toContain(
      '876-page-title-lg'
    )
  })

  it('renders one More actions button', () => {
    render(<ResourceToolbar title="Customers" refresh />)

    expect(
      screen.getAllByRole('button', { name: 'More actions' })
    ).toHaveLength(1)
  })

  it('renders one primary button', () => {
    render(<ResourceToolbar title="Customers" primaryLabel="Add" />)

    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(1)
  })

  it("defaults mobilePrimary to 'button' and renders the primary", () => {
    render(<ResourceToolbar title="Customers" primaryLabel="Add" />)

    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it("keeps a fab-owned primary in the DOM with its phone-hidden class", () => {
    render(
      <ResourceToolbar
        title="Customers"
        primaryLabel="Add"
        mobilePrimary="fab-owns-it"
      />
    )

    const primary = screen.getByRole('button', { name: 'Add' })
    expect(primary.parentElement?.className).toContain('hidden')
    expect(primary.parentElement?.className).toContain('sm:!inline-flex')
  })

  it('keeps the mobile-primary class on the primary wrapper', () => {
    render(<ResourceToolbar title="Customers" primaryLabel="Add" />)

    expect(
      screen.getByRole('button', { name: 'Add' }).parentElement?.className
    ).toContain('876-toolbar-mobile-primary')
  })

  it("renders no primary when its label is absent and mobilePrimary is 'button'", () => {
    render(<ResourceToolbar title="Customers" mobilePrimary="button" />)

    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it("renders no primary when its label is absent and mobilePrimary is 'fab-owns-it'", () => {
    render(<ResourceToolbar title="Customers" mobilePrimary="fab-owns-it" />)

    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it('keeps the ghost circular phone trigger and outline desktop trigger', () => {
    render(<ResourceToolbar title="Customers" refresh />)

    expect(screen.getByRole('button', { name: 'More actions' })).toHaveClass(
      'size-9',
      'rounded-full',
      'border-0',
      'sm:size-8',
      'sm:border-border-strong',
      'sm:bg-background',
      'sm:shadow-xs'
    )
  })

  it('renders refresh and the standard transfer actions once', async () => {
    render(<ResourceToolbar title="Customers" refresh />)
    await openActions()

    expect(screen.getAllByRole('menuitem', { name: 'Refresh' })).toHaveLength(1)
    expect(screen.getAllByRole('menuitem', { name: 'Import' })).toHaveLength(1)
    expect(screen.getAllByRole('menuitem', { name: 'Export' })).toHaveLength(1)
    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'data-disabled'
    )
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'data-disabled'
    )
  })

  it('refreshes through the router once', async () => {
    render(<ResourceToolbar title="Customers" refresh />)
    await openActions()
    await userEvent
      .setup()
      .click(screen.getByRole('menuitem', { name: 'Refresh' }))

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('renders supplied dropdown actions with their labels', async () => {
    render(
      <ResourceToolbar
        title="Customers"
        dropdownActions={[{ label: 'Archive' }, { label: 'Delete' }]}
      />
    )
    await openActions()

    expect(screen.getAllByRole('menuitem', { name: 'Archive' })).toHaveLength(1)
    expect(screen.getAllByRole('menuitem', { name: 'Delete' })).toHaveLength(1)
  })

  it('renders the description once', () => {
    render(<ResourceToolbar title="Customers" description="All customers" />)

    expect(screen.getAllByText('All customers')).toHaveLength(1)
    expect(screen.getByText('All customers')).toHaveClass(
      'text-muted-foreground',
      'mt-1',
      'text-sm'
    )
  })
})
