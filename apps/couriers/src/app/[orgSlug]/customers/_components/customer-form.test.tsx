/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerRow } from '@/types/customer'
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))
vi.mock('@/lib/client', () => ({
  client: { customers: { create: mocks.create, update: mocks.update } },
}))
import { CustomerForm } from './customer-form'

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillRequiredCreateFields() {
  fill('First name', 'Marlon')
  fill('Email', 'marlon.brown@example.jm')
}
function customer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: 'cprof_nkr',
    tenantId: 'ten_nkr',
    userId: 'usr_marlon',
    billingCustomerId: 'cus_nkr',
    branchId: 'br_kingston',
    status: 'ACTIVE',
    trn: '123-456-789',
    isCommercial: true,
    firstSeenAt: 1,
    createdAt: 1,
    updatedAt: 1,
    customerKind: 'INDIVIDUAL',
    customerType: 'CORE_USER',
    name: 'Marlon Brown',
    firstName: 'Marlon',
    lastName: 'Brown',
    companyName: null,
    email: 'marlon.brown@example.jm',
    phone: '+18765550142',
    mailboxNumber: 'KNG-1042',
    branchName: 'Kingston',
    ...overrides,
  }
}
describe('CustomerForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: { id: 'cprof_nkr' }, error: null })
    mocks.update.mockResolvedValue({ data: { id: 'cprof_nkr' }, error: null })
  })
  it('shows identity validation and never creates an individual with no first name', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[]} />)
    fireEvent.submit(
      screen.getByRole('button', { name: 'Add' }).closest('form')!
    )
    expect(
      await screen.findByText('Complete the required identity fields.')
    ).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  // The form renders a dial-code list per keystroke, so `user.type` on several
  // fields is quadratic here and trips the 5s timeout. Setting values directly
  // exercises the same submit path in a fraction of the time.
  it('creates an individual with exact customer params and no status', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[]} />)
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', 'marlon.brown@example.jm')
    fill('TRN', '123-456-789')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('nkr-express', {
      firstName: 'Marlon',
      lastName: 'Brown',
      email: 'marlon.brown@example.jm',
      branchId: undefined,
      trn: '123-456-789',
      isCommercial: false,
      customerKind: 'INDIVIDUAL',
      idempotencyKey: expect.any(String),
    })
  })

  it('auto-selects the only branch when creating a customer', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fillRequiredCreateFields()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      'nkr-express',
      expect.objectContaining({ branchId: 'br_kingston' })
    )
  })

  it('does not select a branch automatically when multiple branches exist', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[
          { id: 'br_kingston', name: 'Kingston' },
          { id: 'br_mobay', name: 'Montego Bay' },
        ]}
      />
    )
    fillRequiredCreateFields()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      'nkr-express',
      expect.objectContaining({ branchId: undefined })
    )
  })

  it('preserves an existing customer branch instead of replacing it', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_mobay', name: 'Montego Bay' }]}
        customer={customer({ branchId: 'br_kingston' })}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.objectContaining({ branchId: 'br_kingston' })
    )
  })
  it('sends only courier fields and status when editing a CORE_USER', async () => {
    render(
      <CustomerForm orgSlug="nkr-express" branches={[]} customer={customer()} />
    )
    fill('TRN', '987-654-321')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('nkr-express', 'cprof_nkr', {
      branchId: 'br_kingston',
      trn: '987-654-321',
      isCommercial: true,
      status: 'ACTIVE',
    })
  })
  it('disables customer type radios in edit mode', () => {
    render(
      <CustomerForm orgSlug="nkr-express" branches={[]} customer={customer()} />
    )
    // Base UI renders a radio as a span carrying aria-disabled, so the native
    // `toBeDisabled` matcher never sees it.
    expect(screen.getByRole('radio', { name: 'Individual' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('radio', { name: 'Business' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('splits a stored Jamaican number and submits it unchanged', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'EXTERNAL' })}
      />
    )

    // The catalog carries +1 for the whole NANP rather than a Jamaica-specific
    // +1876, so the area code stays in the national field. What matters is that
    // the pair recombines to exactly what was stored.
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue(
      '8765550142'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.objectContaining({ phone: '+18765550142' })
    )
  })
  it('sends null when an existing optional email is cleared', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'EXTERNAL' })}
      />
    )
    fill('Email', '')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.objectContaining({ email: null })
    )
  })
  it('omits an optional email that was empty and left untouched', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'EXTERNAL', email: null })}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0]?.[2]).not.toHaveProperty('email')
  })
})
