import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  updatePayment: vi.fn(),
  deletePayment: vi.fn(),
  applyPayment: vi.fn(),
  listRefunds: vi.fn(),
  createRefund: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
  },
}))
vi.mock('../payments.service', () => ({
  paymentsService: {
    updatePayment: mocks.updatePayment,
    deletePayment: mocks.deletePayment,
    applyPayment: mocks.applyPayment,
    listRefunds: mocks.listRefunds,
    createRefund: mocks.createRefund,
  },
}))

const base = '/api/v1/integrations/organizations/org_1'
const payment = { object: 'payment', id: 'pay_1' }
const refund = { object: 'refund', id: 'ref_1' }
const updateBody = {
  customerId: 'cus_1',
  paymentModeId: 'mode_1',
  depositAccountId: 'bank_1',
  amount: '10000',
  bankCharges: '0',
  currency: 'JMD',
  paymentDate: 1_788_825_600,
  allocations: [],
}

function authorized(call: request.Test) {
  return call.set('x-876-api-key', '876_app_secret_invoice')
}

describe('Payment integration routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'ten_1',
      active: true,
    })
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.payments.read', 'billing.payments.write']),
    })
    mocks.appForApiKey.mockResolvedValue({ id: 'app_invoice' })
    mocks.updatePayment.mockResolvedValue(payment)
    mocks.deletePayment.mockResolvedValue({ ...payment, deleted: true })
    mocks.applyPayment.mockResolvedValue(payment)
    mocks.listRefunds.mockResolvedValue({
      object: 'list',
      data: [refund],
      has_more: false,
      total_count: 1,
      url: `${base}/refunds`,
    })
    mocks.createRefund.mockResolvedValue(refund)
  })

  it('updates only through the authenticated app source boundary', async () => {
    const response = await authorized(
      request(createApp()).patch(`${base}/payments/pay_1`)
    ).send(updateBody)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: payment, error: null })
    expect(mocks.updatePayment).toHaveBeenCalledWith(
      'ten_1',
      'pay_1',
      { ...updateBody, amount: 10_000n, bankCharges: 0n },
      'app_invoice'
    )
  })

  it('cancels only through the authenticated app source boundary', async () => {
    const response = await authorized(
      request(createApp()).delete(`${base}/payments/pay_1`)
    )

    expect(response.status).toBe(200)
    expect(mocks.deletePayment).toHaveBeenCalledWith(
      'ten_1',
      'pay_1',
      'app_invoice'
    )
  })

  it('applies payment credit only through the authenticated app source boundary', async () => {
    const response = await authorized(
      request(createApp()).post(`${base}/payments/pay_1/apply`)
    ).send({ allocations: [{ invoiceId: 'inv_1', amount: '2500' }] })

    expect(response.status).toBe(201)
    expect(mocks.applyPayment).toHaveBeenCalledWith(
      'ten_1',
      'pay_1',
      { allocations: [{ invoiceId: 'inv_1', amount: 2_500n }] },
      'app_invoice'
    )
  })

  it('lists only refund evidence attributed to the authenticated app', async () => {
    const response = await authorized(
      request(createApp()).get(`${base}/refunds`)
    )

    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([refund])
    expect(mocks.listRefunds).toHaveBeenCalledWith(
      'ten_1',
      'app_invoice',
      `${base}/refunds`
    )
  })

  it('creates refunds through the authenticated app source boundary', async () => {
    const body = {
      customerId: 'cus_1',
      currency: 'JMD',
      amount: '2500',
      paymentId: 'pay_1',
      paymentModeId: 'mode_1',
      depositAccountId: 'bank_1',
      refundedAt: 1_788_825_600,
    }
    const response = await authorized(
      request(createApp()).post(`${base}/refunds`)
    ).send(body)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: refund, error: null })
    expect(mocks.createRefund).toHaveBeenCalledWith(
      'ten_1',
      {
        ...body,
        amount: 2_500n,
      },
      'app_invoice'
    )
  })
})
