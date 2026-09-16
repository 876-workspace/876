import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'
import { AppHttpError } from '@/http/errors'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  effectiveMember: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
  prepareDocumentEmail: vi.fn(),
  sendDocumentEmail: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  effectiveMemberAuthorization: mocks.effectiveMember,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/providers/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/providers/identity')>()),
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
    introspect = mocks.introspect
    organizationMembership = mocks.organizationMembership
  },
}))
vi.mock('../document-email.service', () => ({
  prepareDocumentEmail: mocks.prepareDocumentEmail,
  sendDocumentEmail: mocks.sendDocumentEmail,
}))

const ORGANIZATION = 'org_kingston'
const TENANT = 'ten_kingston_01'
const INVOICE = 'inv_kingston_01'
const QUOTE = 'quote_kingston_01'

const composition = {
  object: 'document_email_composition' as const,
  resourceType: 'invoice' as const,
  resourceId: INVOICE,
  sender: {
    id: 'sender_default',
    name: 'Kingston Supplies',
    email: 'billing@kingstonsupplies.example',
    replyTo: null,
  },
  to: [{ email: 'customer@example.com', name: 'Customer' }],
  cc: [],
  bcc: [],
  templateId: 'template_invoice_default',
  subject: 'Invoice INV-001 from Kingston Supplies',
  html: '<p>Your invoice is ready.</p>',
  text: 'Your invoice is ready.',
}

const sendBody = {
  senderId: 'sender_default',
  templateId: 'template_invoice_default',
  to: [{ email: 'customer@example.com', name: 'Customer' }],
  cc: [],
  bcc: [],
  subject: 'Invoice INV-001 from Kingston Supplies',
  html: '<p>Your invoice is ready.</p>',
  text: 'Your invoice is ready.',
}

const delivery = {
  object: 'document_email_delivery' as const,
  resourceType: 'invoice' as const,
  resourceId: INVOICE,
  deliveryId: 'delivery_01',
  providerMessageId: 'resend_message_01',
  status: 'sent',
  sentAt: 1_789_000_000,
}

function tenantCall(call: request.Test) {
  return call
    .set('authorization', 'Bearer access-token')
    .set('x-billing-organization-id', ORGANIZATION)
}

function integrationCall(call: request.Test) {
  return call.set('x-876-api-key', '876_app_secret_invoice')
}

describe('Document email routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockImplementation(
      async (organizationId: string) =>
        organizationId === ORGANIZATION ? { id: TENANT, active: true } : null
    )
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales:read', 'sales:write']),
    })
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set([
        'billing.invoices.read',
        'billing.invoices.write',
        'billing.quotes.read',
        'billing.quotes.write',
      ]),
    })
    mocks.appForApiKey.mockResolvedValue({ id: 'app_invoice' })
    mocks.introspect.mockResolvedValue({
      active: true,
      subject: 'user_2kL9mN4q',
      appId: null,
      scopes: new Set(),
    })
    mocks.organizationMembership.mockResolvedValue({ role: 'super-admin' })
    mocks.prepareDocumentEmail.mockResolvedValue(composition)
    mocks.sendDocumentEmail.mockResolvedValue(delivery)
  })

  it('prepares an invoice email through the tenant route', async () => {
    const response = await tenantCall(
      request(createApp()).get(`/api/v1/invoices/${INVOICE}/email`)
    ).query({ templateId: 'template_invoice_default' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: composition, error: null })
    expect(mocks.prepareDocumentEmail).toHaveBeenCalledWith(
      TENANT,
      'invoice',
      INVOICE,
      { templateId: 'template_invoice_default' },
      undefined
    )
  })

  it('requires an idempotency key before sending a tenant invoice email', async () => {
    const response = await tenantCall(
      request(createApp()).post(`/api/v1/invoices/${INVOICE}/send-email`)
    ).send(sendBody)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('billing/idempotency-key-required')
    expect(mocks.sendDocumentEmail).not.toHaveBeenCalled()
  })

  it('sends a tenant invoice email with user attribution and idempotency', async () => {
    const response = await tenantCall(
      request(createApp()).post(`/api/v1/invoices/${INVOICE}/send-email`)
    )
      .set('Idempotency-Key', 'invoice-email-001')
      .send(sendBody)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: delivery, error: null })
    expect(mocks.sendDocumentEmail).toHaveBeenCalledWith(
      TENANT,
      'invoice',
      INVOICE,
      sendBody,
      expect.objectContaining({ key: 'invoice-email-001' }),
      { actorId: 'user_2kL9mN4q' }
    )
  })

  it('passes the calling app identity into an integration invoice prepare', async () => {
    const response = await integrationCall(
      request(createApp()).get(
        `/api/v1/integrations/organizations/${ORGANIZATION}/invoices/${INVOICE}/email`
      )
    )

    expect(response.status).toBe(200)
    expect(mocks.prepareDocumentEmail).toHaveBeenCalledWith(
      TENANT,
      'invoice',
      INVOICE,
      {},
      'app_invoice'
    )
  })

  it('requires invoice write scope for integration email sends', async () => {
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.invoices.read']),
    })

    const response = await integrationCall(
      request(createApp()).post(
        `/api/v1/integrations/organizations/${ORGANIZATION}/invoices/${INVOICE}/send-email`
      )
    )
      .set('Idempotency-Key', 'integration-email-001')
      .send(sendBody)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.sendDocumentEmail).not.toHaveBeenCalled()
  })

  it('keeps an unknown organization from reaching document email services', async () => {
    const response = await tenantCall(
      request(createApp()).get(`/api/v1/invoices/${INVOICE}/email`)
    ).set('x-billing-organization-id', 'org_other')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('billing/tenant-not-found')
    expect(mocks.prepareDocumentEmail).not.toHaveBeenCalled()
  })

  it('prepares a quote email through the integration route with source-app ownership', async () => {
    const quoteComposition = {
      ...composition,
      resourceType: 'quote' as const,
      resourceId: QUOTE,
      templateId: 'template_quote_default',
    }
    mocks.prepareDocumentEmail.mockResolvedValue(quoteComposition)

    const response = await integrationCall(
      request(createApp()).get(
        `/api/v1/integrations/organizations/${ORGANIZATION}/quotes/${QUOTE}/email`
      )
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: quoteComposition, error: null })
    expect(mocks.prepareDocumentEmail).toHaveBeenCalledWith(
      TENANT,
      'quote',
      QUOTE,
      {},
      'app_invoice'
    )
  })

  it('rejects invalid recipient payloads before invoking the send service', async () => {
    const response = await tenantCall(
      request(createApp()).post(`/api/v1/invoices/${INVOICE}/send-email`)
    )
      .set('Idempotency-Key', 'invalid-recipient')
      .send({ ...sendBody, to: [{ email: 'not-an-email' }] })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.sendDocumentEmail).not.toHaveBeenCalled()
  })

  it('preserves Billing-owned provider failure errors at the route boundary', async () => {
    mocks.sendDocumentEmail.mockRejectedValue(
      new AppHttpError({
        code: 'billing/email-unavailable',
        message: 'Email delivery is temporarily unavailable.',
        httpStatus: 503,
      })
    )

    const response = await tenantCall(
      request(createApp()).post(`/api/v1/invoices/${INVOICE}/send-email`)
    )
      .set('Idempotency-Key', 'provider-unavailable')
      .send(sendBody)

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'billing/email-unavailable',
        message: 'Email delivery is temporarily unavailable.',
      },
    })
  })
})
