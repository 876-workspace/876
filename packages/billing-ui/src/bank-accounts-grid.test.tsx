/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { BankAccountsGrid, type BankAccountRow } from './bank-accounts-grid'

function accounts(): BankAccountRow[] {
  return [
    {
      id: 'acct_1',
      name: 'Operating account',
      accountTypeLabel: 'Bank',
      currency: 'JMD',
      isActive: true,
      balance: 'JMD 120,000.00',
    },
    {
      id: 'acct_2',
      name: 'Undeposited funds',
      accountTypeLabel: 'Other asset',
      currency: 'USD',
      isActive: false,
    },
  ]
}

describe('BankAccountsGrid', () => {
  it('renders a card per account with its type and currency', () => {
    render(<BankAccountsGrid accounts={accounts()} baseHref="/banking" />)

    expect(screen.getByText('Operating account')).toBeInTheDocument()
    expect(screen.getByText('Bank · JMD')).toBeInTheDocument()
    expect(screen.getByText('Undeposited funds')).toBeInTheDocument()
    expect(screen.getByText('Other asset · USD')).toBeInTheDocument()
  })

  it('links each account under the host base href', () => {
    render(
      <BankAccountsGrid
        accounts={accounts()}
        baseHref="/orgs/acme/workspace/billing/banking"
      />
    )

    const [first] = screen.getAllByRole('link')
    expect(first).toHaveAttribute(
      'href',
      '/orgs/acme/workspace/billing/banking/acct_1'
    )
  })

  it('carries the host query onto every account link', () => {
    render(
      <BankAccountsGrid
        accounts={accounts()}
        baseHref="/banking"
        query="status=active"
      />
    )

    for (const link of screen.getAllByRole('link'))
      expect(link.getAttribute('href')).toContain('?status=active')
  })

  it('omits the balance block for an account that carries none', () => {
    render(<BankAccountsGrid accounts={accounts()} baseHref="/banking" />)

    expect(screen.getByText('JMD 120,000.00')).toBeInTheDocument()
    // One card has a balance, so exactly one caption may appear. An account
    // without one must not fall back to a zero, which would read as real.
    expect(screen.getAllByText('Recorded balance')).toHaveLength(1)
  })

  it('summarises the accounts, the active ones, and the currencies held', () => {
    render(<BankAccountsGrid accounts={accounts()} baseHref="/banking" />)

    // "Active" is also an account badge, so the tiles are read by their own
    // label element rather than by text alone.
    const tile = (label: string) =>
      screen.getByText(label, { selector: 'p' }).nextElementSibling

    expect(tile('Accounts')).toHaveTextContent('2')
    expect(tile('Active')).toHaveTextContent('1')
    expect(tile('Currencies')).toHaveTextContent('2')
  })

  it('marks an inactive account archived and an active one active', () => {
    render(<BankAccountsGrid accounts={accounts()} baseHref="/banking" />)

    const badges = screen
      .getAllByText(/^(Active|Archived)$/)
      .filter((node) => node.tagName !== 'P')
      .map((node) => node.textContent)

    expect(badges).toEqual(['Active', 'Archived'])
  })

  it('renders the host empty state when there are no accounts', () => {
    render(
      <BankAccountsGrid
        accounts={[]}
        baseHref="/banking"
        emptyState={<div>no-accounts</div>}
      />
    )

    expect(screen.getByText('no-accounts')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
