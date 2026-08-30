// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { CustomerListShell } from './customer-list-shell'

const mocks = vi.hoisted(() => ({ open: false, takeover: false }))

vi.mock('@876/ui/list-detail-shell', () => ({
  ListDetailShell: ({
    toolbar,
    list,
    detail,
  }: {
    toolbar: React.ReactNode
    list: React.ReactNode
    detail: React.ReactNode
  }) => (
    <div data-slot="list-detail-shell">
      {toolbar}
      {list}
      {detail}
    </div>
  ),
  useListDetailRoute: () => ({
    open: mocks.open,
    takeover: mocks.takeover,
  }),
}))

afterEach(cleanup)

describe('CustomerListShell', () => {
  it('renders the list and detail together when a customer record is open', () => {
    mocks.open = true
    mocks.takeover = false

    render(
      <CustomerListShell
        toolbar={<div>Customers toolbar</div>}
        list={<div>Customer list</div>}
      >
        <div>Customer detail</div>
      </CustomerListShell>
    )

    expect(screen.getByText('Customers toolbar')).toBeInTheDocument()
    expect(screen.getByText('Customer list')).toBeInTheDocument()
    expect(screen.getByText('Customer detail')).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="list-detail-shell"]')
    ).toBeInTheDocument()
  })

  it('replaces the shell entirely for a takeover segment', () => {
    mocks.open = false
    mocks.takeover = true

    render(
      <CustomerListShell
        toolbar={<div>Customers toolbar</div>}
        list={<div>Customer list</div>}
        takeoverSegments={['edit']}
      >
        <div>Edit customer</div>
      </CustomerListShell>
    )

    expect(screen.getByText('Edit customer')).toBeInTheDocument()
    expect(screen.queryByText('Customers toolbar')).not.toBeInTheDocument()
    expect(screen.queryByText('Customer list')).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="list-detail-shell"]')
    ).not.toBeInTheDocument()
  })
})
