import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
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

function phoneLayout() {
  const layout = document.querySelector('div.mb-4.sm\\:hidden')
  expect(layout).not.toBeNull()
  return within(layout as HTMLElement)
}

function desktopLayout() {
  const layout = document.querySelector('div.mb-5.hidden.sm\\:flex')
  expect(layout).not.toBeNull()
  return within(layout as HTMLElement)
}

describe('ResourceToolbar', () => {
  beforeEach(() => {
    cleanup()
    mocks.refresh.mockReset()
  })

  it('renders the primary action', () => {
    render(<ResourceToolbar title="Customers" primaryLabel="Add" />)

    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(2)
  })

  it('keeps an accessible primary action when icon-only', () => {
    render(
      <ResourceToolbar title="Customers" primaryLabel="Add" primaryIconOnly />
    )

    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(2)
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

  it('renders the title in both the phone and desktop layouts', () => {
    render(<ResourceToolbar title="Customers" />)

    expect(
      phoneLayout().getByRole('heading', { name: 'Customers' })
    ).toHaveClass('876-page-title-lg')
    expect(
      desktopLayout().getByRole('heading', { name: 'Customers' })
    ).toHaveClass('876-page-title')
  })

  it('renders exactly one h1 in each layout when titleFilter is absent', () => {
    render(<ResourceToolbar title="Customers" />)

    expect(phoneLayout().getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(desktopLayout().getAllByRole('heading', { level: 1 })).toHaveLength(
      1
    )
  })

  it('does not nest h1 elements when titleFilter is present', () => {
    render(
      <ResourceToolbar
        title="Customers"
        titleFilter={<h1 className="876-page-title">Open ⌄</h1>}
      />
    )

    expect(phoneLayout().getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(desktopLayout().getAllByRole('heading', { level: 1 })).toHaveLength(
      1
    )
    expect(phoneLayout().getByRole('heading', { name: 'Open ⌄' })).toBe(
      phoneLayout().getByRole('heading', { level: 1 })
    )
    // A class starting with a digit is not a writable CSS selector, and
    // jsdom's selector engine rejects even the attribute form, so the wrapper
    // is asserted on className rather than matched.
    expect(
      phoneLayout().getByRole('heading', { name: 'Open ⌄' }).parentElement
        ?.className
    ).toContain('876-page-title-lg')
  })

  it("defaults mobilePrimary to 'button'", () => {
    render(<ResourceToolbar title="Customers" primaryLabel="Add" />)

    expect(phoneLayout().getByRole('button', { name: 'Add' })).toBeVisible()
  })

  it("suppresses only the phone action when mobilePrimary is 'fab-owns-it'", () => {
    render(
      <ResourceToolbar
        title="Customers"
        primaryLabel="Add"
        mobilePrimary="fab-owns-it"
      />
    )

    expect(
      phoneLayout().queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(
      desktopLayout().getByRole('button', { name: 'Add' })
    ).toBeInTheDocument()
  })

  it('uses a borderless circular ghost trigger on phone', () => {
    render(<ResourceToolbar title="Customers" refresh />)

    const trigger = phoneLayout().getByRole('button', { name: 'More actions' })
    expect(trigger).toHaveClass('rounded-full', 'size-9', 'border-transparent')
    expect(trigger).not.toHaveClass('bg-background', 'shadow-xs')
  })

  it('keeps the outline trigger on desktop', () => {
    render(<ResourceToolbar title="Customers" refresh />)

    expect(
      desktopLayout().getByRole('button', { name: 'More actions' })
    ).toHaveClass('border', 'bg-background', 'shadow-xs')
  })

  it('renders the description in both layouts', () => {
    render(<ResourceToolbar title="Customers" description="All customers" />)

    expect(phoneLayout().getByText('All customers')).toHaveClass(
      'text-muted-foreground',
      'mt-1',
      'text-sm'
    )
    expect(desktopLayout().getByText('All customers')).toHaveClass(
      'text-muted-foreground',
      'mt-1',
      'text-sm'
    )
  })

  it('keeps the standard transfer actions when refresh is enabled', async () => {
    render(<ResourceToolbar title="Customers" refresh />)
    await openActions()

    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'data-disabled'
    )
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'data-disabled'
    )
  })

  it('renders no primary action without a label for either mobile mode', () => {
    const { rerender } = render(
      <ResourceToolbar title="Customers" mobilePrimary="button" />
    )

    expect(
      phoneLayout().queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(
      desktopLayout().queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()

    rerender(<ResourceToolbar title="Customers" mobilePrimary="fab-owns-it" />)

    expect(
      phoneLayout().queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(
      desktopLayout().queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
  })
})
