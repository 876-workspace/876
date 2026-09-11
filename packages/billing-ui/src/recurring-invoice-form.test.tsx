/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

import {
  RecurringInvoiceForm,
  type RecurringInvoiceFormProps,
} from './recurring-invoice-form'

const START_AT = Math.floor(Date.parse('2026-09-01T00:00:00.000Z') / 1000)

function props(
  overrides: Partial<RecurringInvoiceFormProps> = {}
): RecurringInvoiceFormProps {
  return {
    mode: 'create',
    customers: [{ value: 'cus_1', label: 'Alejandra Reyes' }],
    currencies: [{ value: 'JMD', label: 'Jamaican Dollar (JMD)', decimalPlaces: 2 }],
    items: [],
    defaultCurrency: 'JMD',
    onSubmit: async () => ({ id: 'rinv_1', error: null }),
    ...overrides,
  }
}

async function fillValidLine(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Line 1 description'), 'Retainer')
  await user.clear(screen.getByLabelText('Line 1 rate'))
  await user.type(screen.getByLabelText('Line 1 rate'), '45000')
}

async function fillProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Profile name'), 'Retainer')
  await user.selectOptions(screen.getByLabelText('Customer'), 'cus_1')
  await fillValidLine(user)
}

describe('RecurringInvoiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks submit and shows an error when the profile name is missing', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ id: 'rinv_1', error: null }))
    const user = userEvent.setup()
    render(<RecurringInvoiceForm {...props({ onSubmit })} />)

    // ACT
    await user.selectOptions(screen.getByLabelText('Customer'), 'cus_1')
    await fillValidLine(user)
    await user.click(
      screen.getByRole('button', { name: 'Create recurring invoice' })
    )

    // ASSERT
    expect(screen.getByText('Enter a profile name.')).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()

    // AFTER — testing-library performs cleanup.
  })

  it('blocks submit when no customer is selected', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ id: 'rinv_1', error: null }))
    const user = userEvent.setup()
    render(<RecurringInvoiceForm {...props({ onSubmit })} />)

    // ACT
    await user.type(screen.getByLabelText('Profile name'), 'Retainer')
    await fillValidLine(user)
    await user.click(
      screen.getByRole('button', { name: 'Create recurring invoice' })
    )

    // ASSERT
    expect(screen.getByText('Select a customer.')).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()

    // AFTER — testing-library performs cleanup.
  })

  it('rejects a frequency count below 1', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ id: 'rinv_1', error: null }))
    const user = userEvent.setup()
    render(<RecurringInvoiceForm {...props({ onSubmit })} />)

    // ACT
    await fillProfile(user)
    await user.clear(screen.getByLabelText('Repeats every'))
    await user.type(screen.getByLabelText('Repeats every'), '0')
    await user.click(
      screen.getByRole('button', { name: 'Create recurring invoice' })
    )

    // ASSERT
    expect(
      screen.getByText('Enter a valid frequency of at least every 1 interval.')
    ).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()

    // AFTER — testing-library performs cleanup.
  })

  it('rejects an end date before the start date', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ id: 'rinv_1', error: null }))
    const user = userEvent.setup()
    render(<RecurringInvoiceForm {...props({ onSubmit })} />)

    // ACT
    await fillProfile(user)
    await user.click(screen.getByRole('radio', { name: 'On date' }))
    await user.clear(screen.getByLabelText('Start date'))
    await user.type(screen.getByLabelText('Start date'), '2026-09-01')
    await user.type(screen.getByLabelText('End date'), '2026-08-01')
    await user.click(
      screen.getByRole('button', { name: 'Create recurring invoice' })
    )

    // ASSERT
    expect(
      screen.getByText('The end date must be on or after the start date.')
    ).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()

    // AFTER — testing-library performs cleanup.
  })

  it('submits the exact create payload with mapped lines', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ id: 'rinv_1', error: null }))
    const user = userEvent.setup()
    render(<RecurringInvoiceForm {...props({ onSubmit })} />)

    // ACT
    await fillProfile(user)
    await user.clear(screen.getByLabelText('Start date'))
    await user.type(screen.getByLabelText('Start date'), '2026-09-01')
    await user.click(
      screen.getByRole('button', { name: 'Create recurring invoice' })
    )

    // ASSERT
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      profileName: 'Retainer',
      customerId: 'cus_1',
      currency: 'JMD',
      frequency: { intervalUnit: 'month', intervalCount: 1 },
      startAt: START_AT,
      endAt: null,
      maxCycles: null,
      generationMode: 'draft',
      paymentTermId: null,
      notes: null,
      terms: null,
      lines: [
        {
          description: 'Retainer',
          quantity: 1,
          unitAmount: '4500000',
          discountAmount: '0',
          taxAmount: '0',
        },
      ],
    })
    expect(pushMock).toHaveBeenCalledWith('/recurring-invoices/rinv_1')

    // AFTER — testing-library performs cleanup.
  })

  it('submits maxCycles with a null endAt for the after-N-invoices ending', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ id: 'rinv_1', error: null }))
    const user = userEvent.setup()
    render(<RecurringInvoiceForm {...props({ onSubmit })} />)

    // ACT
    await fillProfile(user)
    await user.click(screen.getByRole('radio', { name: 'After' }))
    await user.type(screen.getByLabelText('Number of invoices'), '3')
    await user.click(
      screen.getByRole('button', { name: 'Create recurring invoice' })
    )

    // ASSERT
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ endAt: null, maxCycles: 3 })
    )

    // AFTER — testing-library performs cleanup.
  })

  it('submits the chosen generation mode, payment term, and notes', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ id: 'rinv_1', error: null }))
    const user = userEvent.setup()
    render(
      <RecurringInvoiceForm
        {...props({
          onSubmit,
          paymentTerms: [{ value: 'term_1', label: 'Net 30' }],
        })}
      />
    )

    // ACT
    await fillProfile(user)
    await user.click(screen.getByRole('radio', { name: 'Finalize and send' }))
    await user.selectOptions(screen.getByLabelText('Payment term'), 'term_1')
    await user.type(screen.getByLabelText('Notes'), 'Billed in advance.')
    await user.click(
      screen.getByRole('button', { name: 'Create recurring invoice' })
    )

    // ASSERT
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        generationMode: 'finalize-and-send',
        paymentTermId: 'term_1',
        notes: 'Billed in advance.',
      })
    )

    // AFTER — testing-library performs cleanup.
  })

  it('renders initial values with a save label in edit mode', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(
      <RecurringInvoiceForm
        {...props({
          mode: 'edit',
          initial: {
            profileName: 'Retainer',
            customerId: 'cus_1',
            currency: 'JMD',
            intervalUnit: 'month',
            intervalCount: 2,
            startAt: START_AT,
            endAt: null,
            maxCycles: 6,
            generationMode: 'finalize',
            paymentTermId: null,
            notes: null,
            terms: null,
            lines: [
              {
                description: 'Retainer',
                quantity: 1,
                unitAmount: '4500000',
                taxAmount: '0',
                discountAmount: '0',
              },
            ],
          },
        })}
      />
    )

    // ACT — no interaction needed; the form hydrates from the profile.

    // ASSERT
    expect(screen.getByLabelText('Profile name')).toHaveValue('Retainer')
    expect(screen.getByLabelText('Repeats every')).toHaveValue(2)
    expect(screen.getByLabelText('Number of invoices')).toHaveValue(6)
    expect(
      screen.getByRole('button', { name: 'Save changes' })
    ).toBeVisible()
    expect(
      screen.getByLabelText('Line 1 description')
    ).toHaveValue('Retainer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // AFTER — testing-library performs cleanup.
  })
})
