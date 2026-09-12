import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))
vi.mock('../request', () => ({ request: requestMock }))

import { createRequestsResource } from './requests'

const runtime = { baseUrl: 'https://crm.test' } as Parameters<
  typeof createRequestsResource
>[0]
const resource = createRequestsResource(runtime)

beforeEach(() => {
  vi.clearAllMocks()
  requestMock.mockResolvedValue({ data: null, error: null })
})

describe('billing-customer request resource', () => {
  it('lists at the billing-customer endpoint', async () => {
    await resource.listForBillingCustomer('org_1', 'cust_1')
    expect(requestMock).toHaveBeenCalledWith(
      runtime,
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org_1/billing-customers/cust_1/requests',
      }),
      expect.anything()
    )
  })

  it('encodes an organization id in the billing-customer endpoint', async () => {
    await resource.listForBillingCustomer('org / north', 'cust_1')
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        path: expect.stringContaining('org%20%2F%20north'),
      })
    )
  })

  it('encodes a billing customer id in the endpoint', async () => {
    await resource.listForBillingCustomer('org_1', 'cust /1')
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ path: expect.stringContaining('cust%20%2F1') })
    )
  })

  it('forwards a status filter to the service', async () => {
    await resource.listForBillingCustomer('org_1', 'cust_1', { status: 'OPEN' })
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ path: expect.stringContaining('status=OPEN') })
    )
  })

  it('forwards a related resource type filter', async () => {
    await resource.listForBillingCustomer('org_1', 'cust_1', {
      relatedResourceType: 'invoice',
    })
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        path: expect.stringContaining('relatedResourceType=invoice'),
      })
    )
  })

  it('forwards a related resource id filter', async () => {
    await resource.listForBillingCustomer('org_1', 'cust_1', {
      relatedResourceId: 'in_1',
    })
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        path: expect.stringContaining('relatedResourceId=in_1'),
      })
    )
  })

  it('does not emit an empty query string', async () => {
    await resource.listForBillingCustomer('org_1', 'cust_1')
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        path: '/v1/organizations/org_1/billing-customers/cust_1/requests',
      })
    )
  })

  it('forwards the request signal', async () => {
    const controller = new AbortController()
    await resource.listForBillingCustomer('org_1', 'cust_1', {
      signal: controller.signal,
    })
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('creates at the billing-customer endpoint', async () => {
    await resource.createForBillingCustomer('org_1', 'cust_1', {
      subject: 'Help',
      createdBy: 'usr_1',
    })
    expect(requestMock).toHaveBeenCalledWith(
      runtime,
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/billing-customers/cust_1/requests',
      }),
      expect.anything()
    )
  })

  it('omits the CRM profile customer id from the billing-customer input', async () => {
    const input = { subject: 'Help', createdBy: 'usr_1' }
    await resource.createForBillingCustomer('org_1', 'cust_1', input)
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ body: input })
    )
  })

  it('preserves a string money snapshot', async () => {
    await resource.createForBillingCustomer('org_1', 'cust_1', {
      subject: 'Help',
      createdBy: 'usr_1',
      relatedResourceType: 'invoice',
      relatedResourceId: 'in_1',
      relatedResourceSnapshot: { amount: '1099', currency: 'USD' },
    })
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: expect.objectContaining({
          relatedResourceSnapshot: { amount: '1099', currency: 'USD' },
        }),
      })
    )
  })

  it('preserves a related resource symbolic type', async () => {
    await resource.createForBillingCustomer('org_1', 'cust_1', {
      subject: 'Help',
      createdBy: 'usr_1',
      relatedResourceType: 'credit-note',
    })
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: expect.objectContaining({ relatedResourceType: 'credit-note' }),
      })
    )
  })

  it('forwards a source app only when an owning service supplies it', async () => {
    await resource.createForBillingCustomer('org_1', 'cust_1', {
      subject: 'Help',
      createdBy: 'usr_1',
      sourceApp: '876-invoice',
    })
    expect(requestMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: expect.objectContaining({ sourceApp: '876-invoice' }),
      })
    )
  })

  it('keeps the result envelope returned by the shared request transport', async () => {
    requestMock.mockResolvedValue({ data: { id: 'req_1' }, error: null })
    await expect(
      resource.createForBillingCustomer('org_1', 'cust_1', {
        subject: 'Help',
        createdBy: 'usr_1',
      })
    ).resolves.toEqual({ data: { id: 'req_1' }, error: null })
  })
})
