import { describe, expect, it } from 'vitest'

import { userTabs } from './user-tabs'

describe('userTabs', () => {
  it('builds the user record tab set in order', () => {
    expect(userTabs('/users/raheem')).toEqual([
      { label: 'Overview', href: '/users/raheem', exact: true },
      { label: 'Transactions', href: '/users/raheem/transactions' },
      { label: 'Requests', href: '/users/raheem/tickets' },
      { label: 'Security', href: '/users/raheem/security' },
      { label: 'Sessions', href: '/users/raheem/sessions' },
      { label: 'Audit', href: '/users/raheem/audit' },
    ])
  })

  it('offers no Contacts, Notes, or Invoices tab', () => {
    const labels = userTabs('/users/raheem').map((tab) => tab.label)

    expect(labels).not.toContain('Contacts')
    expect(labels).not.toContain('Notes')
    expect(labels).not.toContain('Invoices')
  })
})
