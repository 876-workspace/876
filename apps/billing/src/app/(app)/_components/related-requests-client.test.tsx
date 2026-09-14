// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn(), push: vi.fn() }))

vi.mock('@/lib/client/request', () => ({ request: mocks.request }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))

import { RelatedRequestsClient } from './related-requests-client'

const props = {
  customerId: 'cus_1',
  resourceType: 'payment' as const,
  resourceId: 'pay_1',
  snapshot: {
    number: 'PAY-1001',
    amount: '1099',
    currency: 'USD',
    status: 'SUCCEEDED',
  },
  canCreate: true,
}
const list = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/requests',
}

afterEach(cleanup)

describe('Billing related requests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.request.mockResolvedValue({ data: list, error: null })
  })

  it('passes the exact related-resource filters to its customer request route', async () => {
    render(<RelatedRequestsClient {...props} />)

    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1))
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/customers/cus_1/requests?relatedResourceType=payment&relatedResourceId=pay_1',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('hides request creation for a read-only viewer', async () => {
    render(<RelatedRequestsClient {...props} canCreate={false} />)
    await screen.findByText('No related requests')

    expect(
      screen.queryByRole('button', { name: 'New request' })
    ).not.toBeInTheDocument()
  })

  it('renders the New request composer prefilled with the related type and number', async () => {
    render(<RelatedRequestsClient {...props} />)
    await screen.findByText('No related requests')
    fireEvent.click(screen.getByRole('button', { name: 'New request' }))

    expect(screen.getByText('About payment PAY-1001')).toBeInTheDocument()
  })

  it('posts the related snapshot with money kept as a string', async () => {
    mocks.request.mockImplementation((_, options) =>
      options?.method === 'POST'
        ? Promise.resolve({ data: { id: 'req_1' }, error: null })
        : Promise.resolve({ data: list, error: null })
    )
    render(<RelatedRequestsClient {...props} />)
    await screen.findByText('No related requests')
    fireEvent.click(screen.getByRole('button', { name: 'New request' }))
    fireEvent.change(screen.getByPlaceholderText('Subject'), {
      target: { value: 'Need help' },
    })
    fireEvent.change(screen.getByPlaceholderText('Priority'), {
      target: { value: 'priority_1' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create request' }).closest('form')!
    )

    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2))
    expect(mocks.request).toHaveBeenLastCalledWith(
      '/api/customers/cus_1/requests',
      {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Need help',
          description: null,
          priorityId: 'priority_1',
          categoryId: null,
          relatedResourceType: 'payment',
          relatedResourceId: 'pay_1',
          relatedResourceSnapshot: props.snapshot,
        }),
      }
    )
    expect(
      JSON.parse(mocks.request.mock.calls[1][1].body).relatedResourceSnapshot
        .amount
    ).toBe('1099')
  })

  it('navigates to the created request exactly once', async () => {
    mocks.request.mockImplementation((_, options) =>
      options?.method === 'POST'
        ? Promise.resolve({ data: { id: 'req_1' }, error: null })
        : Promise.resolve({ data: list, error: null })
    )
    render(<RelatedRequestsClient {...props} />)
    await screen.findByText('No related requests')
    fireEvent.click(screen.getByRole('button', { name: 'New request' }))
    fireEvent.change(screen.getByPlaceholderText('Subject'), {
      target: { value: 'Need help' },
    })
    fireEvent.change(screen.getByPlaceholderText('Priority'), {
      target: { value: 'priority_1' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create request' }).closest('form')!
    )

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        '/customers/cus_1/requests/req_1'
      )
    )
    expect(mocks.push).toHaveBeenCalledTimes(1)
  })
})
