import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RequestsList, type RequestListRow } from './requests-list'

const normalPriority = {
  object: 'request_priority' as const,
  id: 'crm_pri_normal',
  tenantId: 'crm_tenant_1',
  provisioningKey: 'normal',
  name: 'Normal',
  slug: 'normal',
  description: null,
  color: null,
  icon: null,
  weight: 20,
  sortOrder: 20,
  isDefault: true,
  isActive: true,
  createdBy: null,
  createdAt: 1,
  updatedAt: 1,
}

const highPriority = {
  ...normalPriority,
  id: 'crm_pri_high',
  provisioningKey: 'high',
  name: 'High',
  slug: 'high',
  color: '#f59e0b',
  weight: 30,
  sortOrder: 30,
  isDefault: false,
}

const sampleRequests: RequestListRow[] = [
  {
    id: 'crm_req_1',
    number: 101,
    subject: 'Cannot login to portal',
    status: 'OPEN',
    priority: highPriority,
    source: 'WEB',
    createdAt: 1_788_000_000,
    customerName: 'Island Traders Ltd',
    customerIsBusiness: true,
    isAssigned: true,
    assigneeName: 'Althea Morgan',
    assigneeAvatar: null,
    teamName: 'Support',
  },
  {
    id: 'crm_req_2',
    number: 102,
    subject: 'Invoice inquiry',
    status: 'RESOLVED',
    priority: normalPriority,
    source: 'EMAIL',
    createdAt: 1_788_000_000,
    customerName: 'Jane Doe',
    customerIsBusiness: false,
    isAssigned: false,
    assigneeName: null,
    assigneeAvatar: null,
    teamName: null,
  },
]

describe('RequestsList', () => {
  it('renders requests with configured priority metadata', () => {
    render(<RequestsList requests={sampleRequests} />)

    expect(screen.getByText('2 requests')).toBeTruthy()
    expect(screen.getByText('#101')).toBeTruthy()
    expect(screen.getByText('Cannot login to portal')).toBeTruthy()
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.queryByText('Normal')).toBeNull()
    expect(screen.getByText('#102')).toBeTruthy()
    expect(screen.getByText('Invoice inquiry')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Cannot login to portal/i })
    ).toHaveAttribute('href', '/requests/crm_req_1')
  })

  it('renders empty state when requests array is empty', () => {
    render(<RequestsList requests={[]} />)

    expect(screen.getByText('0 requests')).toBeTruthy()
    expect(screen.getByText('No requests yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/requests/new'
    )
  })

  it('renders custom emptyState when provided', () => {
    render(
      <RequestsList
        requests={[]}
        emptyState={<div>Custom empty requests state</div>}
      />
    )

    expect(screen.getByText('0 requests')).toBeTruthy()
    expect(screen.getByText('Custom empty requests state')).toBeTruthy()
  })

  it('renders filterBar when provided', () => {
    render(
      <RequestsList
        requests={sampleRequests}
        filterBar={<div>Filter bar controls</div>}
      />
    )

    expect(screen.getByText('Filter bar controls')).toBeTruthy()
  })
})
