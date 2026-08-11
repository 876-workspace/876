/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  deleteFn: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/client', () => ({
  client: { customers: { delete: mocks.deleteFn } },
}))

import { CustomerActions } from './customer-actions'

function renderActions(
  props: Partial<React.ComponentProps<typeof CustomerActions>> = {}
) {
  return render(
    <CustomerActions orgSlug="island-logistics" id="cprof_123" {...props} />
  )
}

describe('CustomerActions — Edit link (diff: router.push -> Link)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteFn.mockResolvedValue({ data: { id: 'cprof_123' }, error: null })
  })

  it('renders Edit as a link with correct href, not a push-button', () => {
    renderActions()

    const editLink = screen.getByRole('link', { name: /Edit/i })
    expect(editLink).toBeVisible()
    expect(editLink).toHaveAttribute(
      'href',
      '/island-logistics/customers/cprof_123/edit'
    )
    // Button styling is preserved via Base UI render prop — anchor carries button classes
    expect(editLink.className).toMatch(/inline-flex/)
    // Ensure it is an anchor, not a button that would call router.push
    expect(editLink.tagName.toLowerCase()).toBe('a')
  })

  it('builds href from orgSlug and id, encoding safe', () => {
    renderActions({ orgSlug: 'acme-co', id: 'cprof_99' })
    expect(screen.getByRole('link', { name: /Edit/i })).toHaveAttribute(
      'href',
      '/acme-co/customers/cprof_99/edit'
    )
  })

  it('does not call router.push when Edit link is clicked', async () => {
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('link', { name: /Edit/i }))
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('is keyboard accessible — Edit link is focusable and has visible label', async () => {
    renderActions()
    const link = screen.getByRole('link', { name: /Edit/i })
    link.focus()
    expect(link).toHaveFocus()
    expect(link).toHaveAccessibleName('Edit')
  })

  it('renders the dropdown trigger with accessible name', () => {
    renderActions()
    expect(screen.getByRole('button', { name: /More actions/i })).toBeVisible()
  })
})

describe('CustomerActions — Delete flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteFn.mockResolvedValue({ data: { id: 'cprof_123' }, error: null })
  })

  async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
    renderActions()
    await user.click(screen.getByRole('button', { name: /More actions/i }))
    const deleteItem = await screen.findByRole('menuitem', { name: /Delete/i })
    await user.click(deleteItem)
    return screen.findByRole('alertdialog')
  }

  it('opens the delete confirmation dialog from the menu', async () => {
    const user = userEvent.setup()
    const dialog = await openDeleteDialog(user)
    expect(dialog).toBeVisible()
    expect(
      screen.getByRole('heading', { name: /Delete customer\?/i })
    ).toBeVisible()
    expect(screen.getByText(/archives the courier profile/i)).toBeVisible()
  })

  it('cancel closes the dialog without calling delete', async () => {
    const user = userEvent.setup()
    await openDeleteDialog(user)
    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    expect(mocks.deleteFn).not.toHaveBeenCalled()
  })

  it('confirm calls client.customers.delete with orgSlug and id', async () => {
    const user = userEvent.setup()
    await openDeleteDialog(user)
    await user.click(
      screen.getByRole('button', { name: /^Delete$/i, hidden: false })
    )
    // The dialog Delete button is inside alertdialog; wait for call
    await waitFor(() =>
      expect(mocks.deleteFn).toHaveBeenCalledWith(
        'island-logistics',
        'cprof_123'
      )
    )
    await waitFor(() => expect(mocks.deleteFn).toHaveBeenCalledTimes(1))
  })

  it('on successful delete navigates to customers list and refreshes', async () => {
    const user = userEvent.setup()
    mocks.deleteFn.mockResolvedValue({ data: { id: 'cprof_123' }, error: null })
    await openDeleteDialog(user)
    // there are two Delete buttons — menuitem and alert action; target the dialog one
    const dialogDeletes = screen.getAllByRole('button', { name: /^Delete$/i })
    const confirmBtn = dialogDeletes[dialogDeletes.length - 1]!
    await user.click(confirmBtn)
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith('/island-logistics/customers')
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('on delete error does not navigate', async () => {
    const user = userEvent.setup()
    mocks.deleteFn.mockResolvedValue({ data: null, error: { message: 'fail' } })
    await openDeleteDialog(user)
    const dialogDeletes = screen.getAllByRole('button', { name: /^Delete$/i })
    await user.click(dialogDeletes[dialogDeletes.length - 1]!)
    // wait a tick for transition
    await waitFor(() => expect(mocks.deleteFn).toHaveBeenCalledTimes(1))
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('disables Confirm and Cancel while pending', async () => {
    const user = userEvent.setup()
    let resolve!: (v: unknown) => void
    mocks.deleteFn.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    await openDeleteDialog(user)
    const dialogDeletes = screen.getAllByRole('button', { name: /^Delete$/i })
    const confirmBtn = dialogDeletes[dialogDeletes.length - 1]!
    await user.click(confirmBtn)
    // pending state disables buttons
    await waitFor(() => expect(confirmBtn).toBeDisabled())
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled()
    resolve({ data: { id: 'cprof_123' }, error: null })
    await waitFor(() => expect(confirmBtn).toBeEnabled())
  })
})
