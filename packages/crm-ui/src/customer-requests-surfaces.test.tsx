// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CustomerRequestsPanel } from './customer-requests-panel'
import { RelatedRequestsPanel } from './related-requests-panel'
import { RequestComposer } from './request-composer'

afterEach(cleanup)

const request = {
  object: 'request' as const,
  id: 'req_1',
  tenantId: 'tenant_1',
  customerId: 'customer_1',
  number: 42,
  subject: 'Invoice address is wrong',
  categoryId: null,
  subcategoryId: null,
  status: 'OPEN' as const,
  priorityId: 'priority_1',
  priority: {
    object: 'request_priority' as const,
    id: 'priority_1',
    tenantId: 'tenant_1',
    provisioningKey: null,
    name: 'Normal',
    slug: 'normal',
    description: null,
    color: null,
    icon: null,
    weight: 1,
    sortOrder: 1,
    isDefault: true,
    isActive: true,
    createdBy: null,
    createdAt: 1,
    updatedAt: 1,
  },
  channel: 'API' as const,
  teamId: null,
  assigneeId: null,
  ownerId: null,
  requesterUserId: null,
  requesterContactId: null,
  createdBy: 'user_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('customer request panels', () => {
  it('renders the customer loading state', () => {
    render(
      <CustomerRequestsPanel
        state={{ status: 'loading' }}
        requestBaseHref="/x"
      />
    )
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })
  it('renders the customer error message', () => {
    render(
      <CustomerRequestsPanel
        state={{ status: 'error', message: 'Offline' }}
        requestBaseHref="/x"
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Offline')
  })
  it('renders the customer empty state', () => {
    render(
      <CustomerRequestsPanel state={{ status: 'empty' }} requestBaseHref="/x" />
    )
    expect(
      screen.getByText('No requests for this customer')
    ).toBeInTheDocument()
  })
  it('renders an exact customer request link', () => {
    render(
      <CustomerRequestsPanel
        state={{ status: 'ready', requests: [request] }}
        requestBaseHref="/requests"
      />
    )
    expect(
      screen.getByRole('link', {
        name: 'Open request 42: Invoice address is wrong',
      })
    ).toHaveAttribute('href', '/requests/req_1')
  })
  it('builds request links from a serializable base href', () => {
    // Regression: server hosts passed an href function to this client panel,
    // which React rejects at the RSC boundary.
    render(
      <CustomerRequestsPanel
        state={{ status: 'ready', requests: [{ ...request, id: 'req 1/2' }] }}
        requestBaseHref="/efesto/customers/c1/requests"
      />
    )
    expect(
      screen.getByRole('link', { name: /Open request 42/ })
    ).toHaveAttribute('href', '/efesto/customers/c1/requests/req%201%2F2')
  })
  it('renders the customer list inline without the split pane by request', () => {
    render(
      <CustomerRequestsPanel
        state={{ status: 'ready', requests: [request] }}
        requestBaseHref="/customers/c1/requests"
        layout="inline"
      />
    )

    expect(
      screen.getByRole('link', { name: /Open request 42/ })
    ).toHaveAttribute('href', '/customers/c1/requests/req_1')
    expect(
      document.querySelector('[data-slot="list-pane"]')
    ).not.toBeInTheDocument()
  })
  it('keeps the customer panel pane layout as the default', () => {
    render(
      <CustomerRequestsPanel
        state={{ status: 'ready', requests: [request] }}
        requestBaseHref="/requests"
      />
    )

    expect(
      document.querySelector('[data-slot="list-pane"]')
    ).toBeInTheDocument()
  })
  it('does not render a new request button without a host href', () => {
    render(
      <CustomerRequestsPanel state={{ status: 'empty' }} requestBaseHref="/x" />
    )
    expect(
      screen.queryByRole('link', { name: 'New request' })
    ).not.toBeInTheDocument()
  })
  it('renders the host supplied new request href', () => {
    render(
      <CustomerRequestsPanel
        state={{ status: 'empty' }}
        requestBaseHref="/x"
        newRequestHref="/requests/new"
      />
    )
    expect(screen.getByRole('link', { name: 'New request' })).toHaveAttribute(
      'href',
      '/requests/new'
    )
  })
  it('renders the related loading state', () => {
    render(
      <RelatedRequestsPanel
        state={{ status: 'loading' }}
        requestHref={() => '/x'}
      />
    )
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })
  it('renders the related error state', () => {
    render(
      <RelatedRequestsPanel
        state={{ status: 'error', message: 'Unavailable' }}
        requestHref={() => '/x'}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Unavailable')
  })
  it('renders the related empty state', () => {
    render(
      <RelatedRequestsPanel
        state={{ status: 'empty' }}
        requestHref={() => '/x'}
      />
    )
    expect(screen.getByText('No related requests')).toBeInTheDocument()
  })
  it('renders the related request href from the host builder', () => {
    render(
      <RelatedRequestsPanel
        state={{ status: 'ready', requests: [request] }}
        requestHref={(id) => `/invoice/requests/${id}`}
      />
    )
    expect(
      screen.getByRole('link', { name: '#42 Invoice address is wrong' })
    ).toHaveAttribute('href', '/invoice/requests/req_1')
  })
  it('renders composer loading copy', () => {
    render(
      <RequestComposer
        state={{ status: 'loading' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Loading request form…')).toBeInTheDocument()
  })
  it('renders composer error copy', () => {
    render(
      <RequestComposer
        state={{ status: 'error', message: 'No priorities' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('No priorities')
  })
  it('renders a related resource chip without a route assumption', () => {
    render(
      <RequestComposer
        state={{ status: 'ready' }}
        relatedResource={{
          type: 'invoice',
          id: 'in_1',
          snapshot: { number: 'INV-42', amount: '1099' },
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('About invoice INV-42')).toBeInTheDocument()
  })
  it('submits exact trimmed composer values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <RequestComposer
        state={{ status: 'ready' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Subject'), {
      target: { value: '  Help  ' },
    })
    fireEvent.change(screen.getByPlaceholderText('Description'), {
      target: { value: ' Details ' },
    })
    fireEvent.change(screen.getByPlaceholderText('Priority'), {
      target: { value: ' priority_1 ' },
    })
    fireEvent.change(screen.getByPlaceholderText('Category (optional)'), {
      target: { value: ' category_1 ' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create request' }).closest('form')!
    )
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        subject: 'Help',
        description: 'Details',
        priority: 'priority_1',
        category: 'category_1',
      })
    )
  })
  it('maps an empty category to null', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <RequestComposer
        state={{ status: 'ready' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Subject'), {
      target: { value: 'Help' },
    })
    fireEvent.change(screen.getByPlaceholderText('Priority'), {
      target: { value: 'priority_1' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create request' }).closest('form')!
    )
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: null })
      )
    )
  })
  it('does not submit a composer while loading', () => {
    const onSubmit = vi.fn()
    render(
      <RequestComposer
        state={{ status: 'loading' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })
  it('calls the host cancel callback once', () => {
    const onCancel = vi.fn()
    render(
      <RequestComposer
        state={{ status: 'ready' }}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
  it('keeps the form mounted and reports a rejected host mutation', async () => {
    render(
      <RequestComposer
        state={{ status: 'ready' }}
        onSubmit={vi.fn().mockRejectedValue(new Error('Denied'))}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Subject'), {
      target: { value: 'Help' },
    })
    fireEvent.change(screen.getByPlaceholderText('Priority'), {
      target: { value: 'priority_1' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create request' }).closest('form')!
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Denied')
    expect(screen.getByPlaceholderText('Subject')).toBeInTheDocument()
  })
  it('does not expose a service client in panel markup', () => {
    render(
      <CustomerRequestsPanel
        state={{ status: 'ready', requests: [request] }}
        requestBaseHref="/x"
      />
    )
    expect(document.body.textContent).not.toContain('CRM_SERVICE_KEY')
  })
  it('keeps a money snapshot as display text rather than coercing it', () => {
    render(
      <RequestComposer
        state={{ status: 'ready' }}
        relatedResource={{
          type: 'payment',
          id: 'pay_1',
          snapshot: { number: 'PAY-1', amount: '0001099' },
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('About payment PAY-1')).toBeInTheDocument()
  })
})
