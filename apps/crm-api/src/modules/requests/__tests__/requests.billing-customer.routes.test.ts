import express from 'express'
import { getError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const service = vi.hoisted(() => ({
  listForBillingCustomer: vi.fn(),
  createForBillingCustomer: vi.fn(),
}))

vi.mock('../requests.service.js', () => service)
vi.mock('../../events/index.js', () => ({
  createEventsRouter: () => express.Router(),
}))
vi.mock('../../notes/index.js', () => ({ createNotesRouter: () => express.Router() }))
vi.mock('../../reminders/index.js', () => ({
  createRemindersRouter: () => express.Router(),
}))
vi.mock('../../tasks/index.js', () => ({ createTasksRouter: () => express.Router() }))

const { errorHandler } = await import('../../../http/error-handler.js')
const { createBillingCustomerRequestsRouter } = await import('../requests.routes.js')

function app() {
  const instance = express()
  instance.use(express.json())
  instance.use(
    '/v1/organizations/:organizationId/billing-customers/:billingCustomerId/requests',
    createBillingCustomerRequestsRouter()
  )
  instance.use(errorHandler)
  return instance
}

function serviceHeaders(slug = '876-invoice') {
  return { 'x-876-service-app': slug, 'x-876-service-key': `${slug}-key` }
}

const created = { object: 'request', id: 'req_1', number: 42 }

describe('billing-customer request routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRM_SERVICE_KEYS = JSON.stringify({
      '876-invoice': '876-invoice-key',
      '876-billing': '876-billing-key',
    })
    process.env.CRM_INTERNAL_KEY = 'internal-key'
    service.listForBillingCustomer.mockResolvedValue([])
    service.createForBillingCustomer.mockResolvedValue(created)
  })

  it('rejects an unauthenticated billing-customer request before resolving a tenant', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app()).get('/v1/organizations/org_a/billing-customers/cus_shared/requests')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } })
    expect(service.listForBillingCustomer).not.toHaveBeenCalled()
  })

  it('passes the requested organization to the billing-customer list operation', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app()).get('/v1/organizations/org_a/billing-customers/cus_shared/requests?status=OPEN').set(serviceHeaders())

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { object: 'list', data: [], has_more: false, total_count: 0, url: '/v1/organizations/org_a/billing-customers/cus_shared/requests' }, error: null })
    expect(service.listForBillingCustomer).toHaveBeenCalledTimes(1)
    expect(service.listForBillingCustomer).toHaveBeenCalledWith('org_a', 'cus_shared', { status: 'OPEN' })
  })

  it('does not reuse a billing-customer lookup across organizations', async () => {
    const { default: request } = await import('supertest')
    await request(app()).get('/v1/organizations/org_a/billing-customers/cus_shared/requests').set(serviceHeaders())
    await request(app()).get('/v1/organizations/org_b/billing-customers/cus_shared/requests').set(serviceHeaders())

    expect(service.listForBillingCustomer).toHaveBeenCalledTimes(2)
    expect(service.listForBillingCustomer).toHaveBeenNthCalledWith(1, 'org_a', 'cus_shared', {})
    expect(service.listForBillingCustomer).toHaveBeenNthCalledWith(2, 'org_b', 'cus_shared', {})
  })

  it('returns a standard empty list for an unknown billing customer id', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app()).get('/v1/organizations/org_a/billing-customers/cus_unknown/requests').set(serviceHeaders())

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { object: 'list', data: [], has_more: false, total_count: 0, url: '/v1/organizations/org_a/billing-customers/cus_unknown/requests' }, error: null })
    expect(service.listForBillingCustomer).toHaveBeenCalledWith('org_a', 'cus_unknown', {})
  })

  it('returns customer-not-found when creating for an unknown billing customer id', async () => {
    const { default: request } = await import('supertest')
    service.createForBillingCustomer.mockResolvedValue(getError('crm/customer-not-found'))
    const response = await request(app()).post('/v1/organizations/org_a/billing-customers/cus_unknown/requests').set(serviceHeaders()).send({ subject: 'Need help', createdBy: 'usr_1' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ data: null, error: { code: 'crm/customer-not-found', message: 'Customer not found.' } })
    expect(service.createForBillingCustomer).toHaveBeenCalledWith('org_a', 'cus_unknown', { subject: 'Need help', createdBy: 'usr_1', sourceApp: '876-invoice' })
  })

  it('derives sourceApp from the validated service credential', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app()).post('/v1/organizations/org_a/billing-customers/cus_1/requests').set(serviceHeaders('876-billing')).send({ subject: 'Need help', createdBy: 'usr_1' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: created, error: null })
    expect(service.createForBillingCustomer).toHaveBeenCalledTimes(1)
    expect(service.createForBillingCustomer).toHaveBeenCalledWith('org_a', 'cus_1', { subject: 'Need help', createdBy: 'usr_1', sourceApp: '876-billing' })
  })

  it('rejects a caller-supplied sourceApp without calling the create operation', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app()).post('/v1/organizations/org_a/billing-customers/cus_1/requests').set(serviceHeaders()).send({ subject: 'Need help', createdBy: 'usr_1', sourceApp: '876-console' })

    expect(response.status).toBe(422)
    expect(response.body).toEqual({ data: null, error: { code: 'crm/invalid-request', message: 'Invalid request.' } })
    expect(service.createForBillingCustomer).not.toHaveBeenCalled()
  })

  it('does not infer sourceApp for an internal-key caller', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app()).post('/v1/organizations/org_a/billing-customers/cus_1/requests').set('x-internal-key', 'internal-key').send({ subject: 'Need help', createdBy: 'usr_1' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: created, error: null })
    expect(service.createForBillingCustomer).toHaveBeenCalledWith('org_a', 'cus_1', { subject: 'Need help', createdBy: 'usr_1', sourceApp: undefined })
  })
})
