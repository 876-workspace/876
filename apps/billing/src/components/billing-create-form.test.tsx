/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FormField } from '@/types/form'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  request: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/request', () => ({ request: mocks.request }))

import { CreateForm } from './billing-create-form'

const fields: FormField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'amount', label: 'Amount', type: 'money' },
  { name: 'graceDays', label: 'Grace days', type: 'number' },
  {
    name: 'currency',
    label: 'Currency',
    type: 'select',
    options: [
      { value: 'JMD', label: 'Jamaican dollar' },
      { value: 'USD', label: 'US dollar' },
    ],
  },
  { name: 'active', label: 'Active', type: 'checkbox' },
  {
    name: 'referenceType',
    label: 'Reference type',
    type: 'text',
    pairedWith: 'referenceId',
  },
  {
    name: 'referenceId',
    label: 'Reference ID',
    type: 'text',
    pairedWith: 'referenceType',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'text',
    emptyAsNull: true,
  },
]

describe('Billing create form', () => {
  beforeEach(() => {
    mocks.request.mockResolvedValue({ data: { id: 'item_123' }, error: null })
  })

  it('when submitted, serializes typed values and omits an incomplete field pair', async () => {
    const user = userEvent.setup()
    render(
      <CreateForm
        title="Catalog item"
        endpoint="/api/billing/items"
        fields={fields}
        returnUrl="/items"
      />
    )

    await user.type(screen.getByLabelText(/Name/), '  Priority delivery  ')
    await user.type(screen.getByLabelText('Amount'), '19.99')
    await user.type(screen.getByLabelText('Grace days'), '7')
    await user.selectOptions(screen.getByLabelText('Currency'), 'JMD')
    await user.click(screen.getByRole('checkbox', { name: 'Active' }))
    await user.type(screen.getByLabelText('Reference type'), 'shipment')
    await user.click(
      screen.getByRole('button', { name: 'Create Catalog item' })
    )

    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith('/api/billing/items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Priority delivery',
          amount: '1999',
          graceDays: 7,
          currency: 'JMD',
          active: true,
          description: null,
        }),
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/items')
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('when editing succeeds, uses PATCH and the explicit action labels', async () => {
    const user = userEvent.setup()
    render(
      <CreateForm
        title="Customer"
        endpoint="/api/billing/customers/cus_123"
        fields={[{ name: 'name', label: 'Name', type: 'text' }]}
        returnUrl="/customers/cus_123"
        method="PATCH"
        submitLabel="Save customer"
        pendingLabel="Saving customer…"
      />
    )

    await user.type(screen.getByLabelText('Name'), 'Kingston Studio')
    await user.click(screen.getByRole('button', { name: 'Save customer' }))

    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        '/api/billing/customers/cus_123',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Kingston Studio' }),
        }
      )
    )
    expect(mocks.push).toHaveBeenCalledWith('/customers/cus_123')
  })

  it('when the service rejects the request, displays its message and stays on the form', async () => {
    const user = userEvent.setup()
    mocks.request.mockResolvedValue({
      data: null,
      error: { message: 'The catalog code is already in use.' },
    })
    render(
      <CreateForm
        title="Catalog item"
        endpoint="/api/billing/items"
        fields={[{ name: 'name', label: 'Name', type: 'text' }]}
        returnUrl="/items"
      />
    )

    await user.type(screen.getByLabelText('Name'), 'Express parcel')
    await user.click(
      screen.getByRole('button', { name: 'Create Catalog item' })
    )

    expect(
      await screen.findByText('The catalog code is already in use.')
    ).toBeVisible()
    expect(mocks.push).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Name')).toHaveValue('Express parcel')
  })
})
