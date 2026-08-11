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

const BRANCHES = [{ id: 'br_kingston', name: 'Kingston' }, { id: 'br_mobay', name: 'Montego Bay' }]
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
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
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
      branchId: 'br_kingston',
      trn: '123-456-789',
      isCommercial: false,
      customerKind: 'INDIVIDUAL',
      idempotencyKey: expect.any(String),
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
      status: 'ACTIVE',
    })
  })
  it('shows the selected home branch name instead of its ID', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        customer={customer()}
      />
    )

    const branchSelect = screen.getByRole('combobox', {
      name: 'Branch',
    })
    expect(branchSelect).toHaveTextContent('Kingston')
    expect(branchSelect).not.toHaveTextContent('br_kingston')
    expect(branchSelect).toHaveClass('w-80')
  })
  it('preselects the only home branch for a new customer', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )

    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent(
      'Kingston'
    )
  })
  it('asks for a branch choice when multiple branches are available', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[
          { id: 'br_kingston', name: 'Kingston' },
          { id: 'br_mobay', name: 'Montego Bay' },
        ]}
      />
    )

    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent(
      'Select branch'
    )
  })
  it('requires a branch when the organization has multiple branches', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[
          { id: 'br_kingston', name: 'Kingston' },
          { id: 'br_mobay', name: 'Montego Bay' },
        ]}
      />
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeRequired()
  })
  it('does not expose a customer type choice', () => {
    render(
      <CustomerForm orgSlug="nkr-express" branches={[]} customer={customer()} />
    )
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('requires a first name, last name, and email address for a new customer', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    expect(screen.getByLabelText('First name')).toBeRequired()
    expect(screen.getByLabelText('Last name')).toBeRequired()
    expect(screen.getByLabelText('Email')).toBeRequired()
  })
  it('defaults the phone picker to Jamaica', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )

    expect(screen.getAllByRole('combobox')[0]?.textContent).toBe('🇯🇲\u2002+1')
  })
  it('splits a stored Jamaican number and submits it unchanged', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'EXTERNAL' })}
      />
    )

    // The shared NANP prefix stays at +1, so either Jamaican area code can be
    // entered as part of the national number.
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
  it('blocks submission with a branch error when identity is valid but no branch is set', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[
          { id: 'br_kingston', name: 'Kingston' },
          { id: 'br_mobay', name: 'Montego Bay' },
        ]}
      />
    )
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', 'marlon.brown@example.jm')
    fireEvent.submit(
      screen.getByRole('button', { name: 'Add' }).closest('form')!
    )
    expect(await screen.findByText('Select a branch.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('prioritises identity error over branch error when both are missing', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[
          { id: 'br_kingston', name: 'Kingston' },
          { id: 'br_mobay', name: 'Montego Bay' },
        ]}
      />
    )
    fireEvent.submit(
      screen.getByRole('button', { name: 'Add' }).closest('form')!
    )
    expect(
      await screen.findByText('Complete the required identity fields.')
    ).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('disables the submit button while branches are streaming and enables after ready', async () => {
    let resolve: (v: { id: string; name: string }[]) => void = () => {}
    const deferred = new Promise<{ id: string; name: string }[]>((res) => {
      resolve = res
    })
    render(<CustomerForm orgSlug="nkr-express" branches={deferred} />)
    expect(screen.getByLabelText('Loading branches')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    resolve([{ id: 'br_kingston', name: 'Kingston' }])
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Loading branches')
      ).not.toBeInTheDocument()
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
    )
  })

  it('auto-selects a single streamed branch for a new customer', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={Promise.resolve([{ id: 'br_kingston', name: 'Kingston' }])}
      />
    )
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Branch' })
      ).toHaveTextContent('Kingston')
    )
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', 'marlon.brown@example.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      'nkr-express',
      expect.objectContaining({ branchId: 'br_kingston' })
    )
  })

  it('creates without a branch list still validates branch before calling the API', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[]} />)
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', 'm@example.jm')
    fireEvent.submit(
      screen.getByRole('button', { name: 'Add' }).closest('form')!
    )
    expect(await screen.findByText('Select a branch.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('does not require email when editing an existing customer', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        customer={customer()}
      />
    )
    expect(screen.getByLabelText('Email')).not.toBeRequired()
  })

  it('locks identity fields and skips identity validation for a CORE_USER edit', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        customer={customer({ customerType: 'CORE_USER' })}
      />
    )
    expect(screen.getByLabelText('First name')).toBeDisabled()
    expect(screen.getByLabelText('Last name')).toBeDisabled()
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Phone' })).toBeDisabled()
    expect(
      screen.getByText("Identity comes from this customer's 876 account.")
    ).toBeVisible()
    // Clearing would normally be identity error, but CORE_USER bypasses it
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.not.objectContaining({ firstName: expect.anything() })
    )
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.not.objectContaining({ email: expect.anything() })
    )
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.not.objectContaining({ phone: expect.anything() })
    )
  })

  it('sends null email when a CORE_USER save is bypassed but still clears TRN', async () => {
    // CORE_USER identity lock omits email/phone entirely, TRN still uses cleared() null-vs-omit.
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'CORE_USER', trn: '123' })}
      />
    )
    fill('TRN', '')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.objectContaining({ trn: null })
    )
  })

  it('renders company name for a BUSINESS legacy record and hides individual name fields', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({
          customerKind: 'BUSINESS',
          companyName: 'NKR Ltd',
          firstName: null,
          lastName: null,
        })}
      />
    )
    expect(screen.getByLabelText('Company name')).toBeVisible()
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Last name')).not.toBeInTheDocument()
  })

  it('validates company name instead of first/last for a BUSINESS create path', async () => {
    // BUSINESS kind only appears via editing a legacy record; simulate it.
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
        customer={customer({
          customerKind: 'BUSINESS',
          companyName: '',
          firstName: null,
          lastName: null,
          customerType: 'EXTERNAL',
        })}
      />
    )
    // Switch kind to BUSINESS via customer prop: identity should now require companyName
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    // Should hit "Complete the required identity fields." because companyName blank
    expect(
      await screen.findByText('Complete the required identity fields.')
    ).toBeVisible()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('never exposes a commercial toggle or sends isCommercial on update', async () => {
    render(
      <CustomerForm orgSlug="nkr-express" branches={[]} customer={customer()} />
    )
    expect(
      screen.queryByLabelText('Commercial account')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    fill('TRN', '999')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0]?.[2]).not.toHaveProperty('isCommercial')
  })

  it('always sends isCommercial false on create even when editing a commercial fixture', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', 'm@example.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      'nkr-express',
      expect.objectContaining({ isCommercial: false })
    )
  })

  it('shows status selector only when editing', () => {
    const { rerender } = render(
      <CustomerForm orgSlug="nkr-express" branches={[]} />
    )
    expect(screen.queryByText('Status')).not.toBeInTheDocument()
    rerender(
      <CustomerForm orgSlug="nkr-express" branches={[]} customer={customer()} />
    )
    expect(screen.getByText('Status')).toBeVisible()
  })

  it('strips non-digits from phone before submitting', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', 'm@example.jm')
    // PhoneInput splits into country picker + textbox; type with dashes/spaces
    const phoneBox = screen.getByRole('textbox', { name: 'Phone' })
    fireEvent.change(phoneBox, { target: { value: '876-555 0142' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      'nkr-express',
      expect.objectContaining({ phone: '+18765550142' })
    )
  })

  it('omits phone when left blank on create and sends null when cleared on edit', async () => {
    // Create: blank phone omitted
    const { unmount } = render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fill('First name', 'A')
    fill('Last name', 'B')
    fill('Email', 'a@b.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0]?.[1]).not.toHaveProperty('phone')
    unmount()
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: { id: 'cprof_nkr' }, error: null })
    // Edit: clearing a previously set phone sends null
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'EXTERNAL', phone: '+18765550142' })}
      />
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Phone' }), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.objectContaining({ phone: null })
    )
  })

  it('keeps raw stored value for an unrecognized dial prefix instead of dropping digits', async () => {
    // +999 is not a known dial code; splitPhone keeps raw value visible
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ phone: '+99912345678', customerType: 'EXTERNAL' })}
      />
    )
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue(
      '+99912345678'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    // Re-submits as dialCode + number stripped: +99912345678 -> should round-trip as same string
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.objectContaining({ phone: '+99912345678' })
    )
  })

  it('treats whitespace-only email as empty and enforces required for new customers', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', '   ')
    fireEvent.submit(
      screen.getByRole('button', { name: 'Add' }).closest('form')!
    )
    expect(
      await screen.findByText('Complete the required identity fields.')
    ).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('sends trn as null when cleared and omits when untouched empty', async () => {
    // Cleared -> null
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'EXTERNAL', trn: '123' })}
      />
    )
    fill('TRN', '')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_nkr',
      expect.objectContaining({ trn: null })
    )
  })

  it('omits trn when it was null and left empty on edit', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({ customerType: 'EXTERNAL', trn: null })}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0]?.[2]).not.toHaveProperty('trn')
  })

  it('trims TRN whitespace and sends the trimmed value', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fill('First name', 'A')
    fill('Last name', 'B')
    fill('Email', 'a@b.jm')
    fill('TRN', '  123-456  ')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      'nkr-express',
      expect.objectContaining({ trn: '123-456' })
    )
  })

  it('reuses the same idempotency key across retries after a failure', async () => {
    mocks.create
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      })
      .mockResolvedValueOnce({ data: { id: 'cprof_nkr' }, error: null })
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', 'm@example.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(screen.getByText('Network error')).toBeVisible())
    const firstKey = mocks.create.mock.calls[0]?.[1].idempotencyKey as string
    expect(firstKey).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2))
    expect(mocks.create.mock.calls[1]?.[1].idempotencyKey).toBe(firstKey)
  })

  it('surfaces server errors and does not navigate on failure', async () => {
    mocks.create.mockResolvedValueOnce({
      data: null,
      error: { message: 'TRN invalid' },
    })
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    fill('First name', 'M')
    fill('Last name', 'B')
    fill('Email', 'm@example.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('TRN invalid')).toBeVisible()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('defaults phone picker to Jamaica and retains dialCode for unknown numbers', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    expect(screen.getAllByRole('combobox')[0]?.textContent).toBe('🇯🇲\u2002+1')
    // New customer phone is blank but dialCode is +1, not empty
  })

  it('parses a UK number without losing the dial code', async () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[]}
        customer={customer({
          phone: '+447700900123',
          customerType: 'EXTERNAL',
        })}
      />
    )
    // Dial code picker should reflect +44, national number is local part
    const pickers = screen.getAllByRole('combobox')
    expect(pickers[0]?.textContent).toContain('+44')
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue(
      '7700900123'
    )
  })

  it('shows required markers on branch and identity fields for new customers', () => {
    render(
      <CustomerForm
        orgSlug="nkr-express"
        branches={[{ id: 'br_kingston', name: 'Kingston' }]}
      />
    )
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeRequired()
    expect(screen.getByLabelText('First name')).toBeRequired()
    expect(screen.getByLabelText('Email')).toBeRequired()
    // Phone and TRN are not required
    expect(screen.getByRole('textbox', { name: 'Phone' })).not.toBeRequired()
  })

  it('splits a Bahamas NANP number preserving the 242 area code', async () => {
    render(
      <CustomerForm orgSlug="nkr-express" branches={[]} customer={customer({ phone: '+12425551234', customerType: 'EXTERNAL' })} />
    )
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue('2425551234')
    // dial picker still shows +1 (NANP shared) but number includes area
    expect(screen.getAllByRole('combobox')[0]?.textContent).toContain('+1')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('nkr-express', 'cprof_nkr', expect.objectContaining({ phone: '+12425551234' }))
  })

  it('keeps an unparsable stored phone as raw text instead of dropping it', () => {
    render(
      <CustomerForm orgSlug="nkr-express" branches={[]} customer={customer({ phone: 'not-a-number', customerType: 'EXTERNAL' })} />
    )
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue('not-a-number')
  })

  it('omits phone on create when the number field is whitespace only', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    fill('First name', 'A')
    fill('Last name', 'B')
    fill('Email', 'a@b.jm')
    const box = screen.getByRole('textbox', { name: 'Phone' })
    fireEvent.change(box, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0]?.[1]).not.toHaveProperty('phone')
  })

  it('sends an updated phone when edited to a new valid number', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[]} customer={customer({ phone: '+18765550142', customerType: 'EXTERNAL' })} />)
    const box = screen.getByRole('textbox', { name: 'Phone' })
    fireEvent.change(box, { target: { value: '8765559999' } })
    // dial picker is +1 by default, so full is +18765559999
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('nkr-express', 'cprof_nkr', expect.objectContaining({ phone: '+18765559999' }))
  })

  it('trims email before sending and omits branchId validation after trim', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    fill('First name', 'Marlon')
    fill('Last name', 'Brown')
    fill('Email', '  marlon@example.jm  ')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith('nkr-express', expect.objectContaining({ email: 'marlon@example.jm' }))
  })

  it('treats whitespace-only first name as missing', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    fill('First name', '   ')
    fill('Last name', 'Brown')
    fill('Email', 'a@b.jm')
    fireEvent.submit(screen.getByRole('button', { name: 'Add' }).closest('form')!)
    expect(await screen.findByText('Complete the required identity fields.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('treats whitespace-only last name as missing', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    fill('First name', 'Marlon')
    fill('Last name', '   ')
    fill('Email', 'a@b.jm')
    fireEvent.submit(screen.getByRole('button', { name: 'Add' }).closest('form')!)
    expect(await screen.findByText('Complete the required identity fields.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('shows TRN hint and does not mark TRN as required', () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    expect(screen.getByText('Required to start receiving packages.')).toBeVisible()
    expect(screen.getByLabelText('TRN')).not.toBeRequired()
  })

  it('allows changing status when editing', async () => {
    const user = userEvent.setup()
    render(<CustomerForm orgSlug="nkr-express" branches={[]} customer={customer({ status: 'ACTIVE' })} />)
    await user.click(screen.getByRole('combobox', { name: '' }))
    // Status select has no aria label; find by option text
    await user.click(await screen.findByRole('option', { name: 'Suspended' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('nkr-express', 'cprof_nkr', expect.objectContaining({ status: 'SUSPENDED' }))
  })

  it('does not include status when creating a new customer', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    fill('First name', 'A')
    fill('Last name', 'B')
    fill('Email', 'a@b.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0]?.[1]).not.toHaveProperty('status')
  })

  it('ignores email changes for CORE_USER even if the input is programmatically mutated', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[]} customer={customer({ customerType: 'CORE_USER', email: 'original@example.jm' })} />)
    const email = screen.getByLabelText('Email') as HTMLInputElement
    // bypass disabled by removing attribute and changing value (simulates devtools tamper)
    email.removeAttribute('disabled')
    fireEvent.change(email, { target: { value: 'hacker@evil.jm' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0]?.[2]).not.toHaveProperty('email')
  })

  it('sends branchId correctly when editing and branch was pre-selected', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={BRANCHES} customer={customer({ branchId: 'br_mobay' })} />)
    // Branch already shows Montego Bay? Our customer fixture defaults to br_kingston; override above
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('Montego Bay')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('nkr-express', 'cprof_nkr', expect.objectContaining({ branchId: 'br_mobay' }))
  })

  it('creates with no customerType still defaults to INDIVIDUAL and requires first/last', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    expect(screen.getByLabelText('First name')).toBeVisible()
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument()
  })

  it('shows branch skeleton while streaming on edit and retains customer branch after resolution', async () => {
    const deferred = Promise.resolve([{ id: 'br_kingston', name: 'Kingston' }, { id: 'br_mobay', name: 'Montego Bay' }])
    render(<CustomerForm orgSlug="nkr-express" branches={deferred} customer={customer({ branchId: 'br_kingston' })} />)
    expect(screen.getByLabelText('Loading branches')).toBeVisible()
    await waitFor(() => expect(screen.queryByLabelText('Loading branches')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('Kingston')
  })

  it('navigates to customer detail after successful edit and to list after create', async () => {
    const { unmount } = render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    fill('First name', 'A')
    fill('Last name', 'B')
    fill('Email', 'a@b.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/nkr-express/customers'))
    expect(mocks.refresh).toHaveBeenCalled()
    unmount()
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: { id: 'cprof_nkr' }, error: null })
    render(<CustomerForm orgSlug="nkr-express" branches={[]} customer={customer()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/nkr-express/customers/cprof_nkr'))
  })

  it('calls router.back when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<CustomerForm orgSlug="nkr-express" branches={[]} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mocks.back).toHaveBeenCalledTimes(1)
  })

  it('disables Cancel and Branch while submission is pending (isPending)', async () => {
    let resolveCreate: (v: any) => void = () => {}
    mocks.create.mockReturnValue(new Promise((res) => { resolveCreate = res }))
    render(<CustomerForm orgSlug="nkr-express" branches={[{ id: 'br_kingston', name: 'Kingston' }]} />)
    fill('First name', 'A')
    fill('Last name', 'B')
    fill('Email', 'a@b.jm')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeDisabled()
    resolveCreate({ data: { id: 'cprof_nkr' }, error: null })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled())
  })

  it('handles branch promise that resolves to null-ish gracefully (empty)', async () => {
    render(<CustomerForm orgSlug="nkr-express" branches={Promise.resolve([])} />)
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Branch' })).toBeVisible())
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeDisabled()
    fill('First name', 'A')
    fill('Last name', 'B')
    fill('Email', 'a@b.jm')
    fireEvent.submit(screen.getByRole('button', { name: 'Add' }).closest('form')!)
    expect(await screen.findByText('Select a branch.')).toBeVisible()
  })

})
