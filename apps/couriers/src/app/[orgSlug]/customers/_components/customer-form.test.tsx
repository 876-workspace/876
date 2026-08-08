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
      phone: undefined,
      branchId: undefined,
      trn: '123-456-789',
      isCommercial: false,
      customerKind: 'INDIVIDUAL',
    })
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
})
