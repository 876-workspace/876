import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CustomerDetailActions } from './customer-detail-actions'

const groups = [
  {
    actions: [
      { label: 'Invoice', href: '/invoices/new?customerId=cus_1' },
      { label: 'Quote', href: '/quotes/new?customerId=cus_1' },
    ],
  },
]

describe('CustomerDetailActions', () => {
  it('links Edit at the href the host supplies', () => {
    render(
      <CustomerDetailActions
        editHref="/customers/cus_1/edit"
        transactionGroups={groups}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Edit' }).getAttribute('href')
    ).toBe('/customers/cus_1/edit')
  })

  it('opens the transaction menu and lists every action as a link', async () => {
    const user = userEvent.setup()
    render(<CustomerDetailActions transactionGroups={groups} />)

    expect(screen.queryByRole('menuitem', { name: 'Invoice' })).toBeNull()

    await user.click(screen.getByRole('button', { name: /New Transaction/ }))

    const invoice = await screen.findByRole('menuitem', { name: 'Invoice' })
    expect(invoice.getAttribute('href')).toBe('/invoices/new?customerId=cus_1')
    expect(
      screen.getByRole('menuitem', { name: 'Quote' }).getAttribute('href')
    ).toBe('/quotes/new?customerId=cus_1')
  })

  it('hides the transaction menu when the host offers no create routes', () => {
    render(<CustomerDetailActions editHref="/customers/cus_1/edit" />)

    expect(screen.queryByRole('button', { name: /New Transaction/ })).toBeNull()
  })
})
