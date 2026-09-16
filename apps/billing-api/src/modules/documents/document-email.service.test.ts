import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tenantOrganization: vi.fn(),
  enabledCurrencyDecimalPlaces: vi.fn(),
  invoiceRetrieve: vi.fn(),
  quoteRetrieve: vi.fn(),
  templateResolve: vi.fn(),
  templateRender: vi.fn(),
  senderList: vi.fn(),
  deliveryCreate: vi.fn(),
  sendInvoiceWorkflow: vi.fn(),
  transitionQuoteWorkflow: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/modules/tenants', () => ({
  tenantOrganization: mocks.tenantOrganization,
}))
vi.mock('@/modules/currencies', () => ({
  enabledCurrencyDecimalPlaces: mocks.enabledCurrencyDecimalPlaces,
}))
vi.mock('@/lib/services/communications', () => ({
  communicationsService: () => ({
    templates: {
      resolve: mocks.templateResolve,
      render: mocks.templateRender,
    },
    senders: { list: mocks.senderList },
    deliveries: { create: mocks.deliveryCreate },
  }),
}))
vi.mock('./repositories/invoices', () => ({
  invoices: { retrieve: mocks.invoiceRetrieve },
}))
vi.mock('./repositories/quotes', () => ({
  quotes: { retrieve: mocks.quoteRetrieve },
}))
vi.mock('./workflows', () => ({
  sendInvoiceWorkflow: mocks.sendInvoiceWorkflow,
  transitionQuoteWorkflow: mocks.transitionQuoteWorkflow,
}))

import {
  prepareDocumentEmail,
  sendDocumentEmail,
} from './document-email.service'

const tenantId = 'btenant_1'
const organizationId = 'org_1'
const idempotency = { key: 'email-command-1', requestHash: 'request-hash' }

const sender = {
  object: 'email_sender',
  id: 'esnd_1',
  organizationId,
  domainId: 'edom_1',
  name: 'Acme Billing',
  email: 'billing@example.com',
  replyTo: 'help@example.com',
  kind: 'custom-domain',
  isDefault: true,
  isActive: true,
  createdAt: 1,
  updatedAt: 1,
}

const template = {
  object: 'email_template',
  id: 'etpl_1',
  organizationId: null,
  key: 'billing.invoice.default',
  name: 'Invoice',
  category: 'invoice',
  subject: 'Invoice {{documentNumber}}',
  html: '<p>{{documentNumber}}</p>',
  text: '{{documentNumber}}',
  senderId: null,
  isDefault: true,
  isSystem: true,
  isActive: true,
  createdAt: 1,
  updatedAt: 1,
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv_1',
    number: 'INV-001',
    status: 'OPEN',
    currency: 'JMD',
    total: 12345n,
    dueAt: 86400,
    customer: {
      name: 'Ada Lovelace',
      companyName: 'Analytical Engines Ltd',
      email: 'ada@example.com',
    },
    ...overrides,
  }
}

function quote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quo_1',
    number: 'QUO-001',
    status: 'DRAFT',
    currency: 'JMD',
    total: 5000n,
    expiresAt: 1000,
    sentAt: null,
    customer: { name: 'Ada Lovelace', email: 'ada@example.com' },
    ...overrides,
  }
}

function delivery() {
  return {
    object: 'email_delivery',
    id: 'edel_1',
    organizationId,
    resourceType: 'invoice',
    resourceId: 'inv_1',
    templateId: 'etpl_1',
    senderId: 'esnd_1',
    provider: 'resend',
    providerMessageId: 'msg_1',
    idempotencyKey: 'provider-key',
    fromName: sender.name,
    fromEmail: sender.email,
    replyTo: sender.replyTo,
    to: [{ email: 'ada@example.com' }],
    cc: [],
    bcc: [],
    subject: 'Invoice INV-001',
    status: 'sent',
    failureCode: null,
    failureMessage: null,
    queuedAt: 100,
    sentAt: 101,
    deliveredAt: null,
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    complainedAt: null,
    failedAt: null,
    createdAt: 100,
    updatedAt: 101,
  }
}

beforeEach(() => {
  mocks.tenantOrganization.mockResolvedValue({
    tenantId,
    organizationId,
    name: 'Acme Logistics',
  })
  mocks.enabledCurrencyDecimalPlaces.mockResolvedValue(2)
  mocks.invoiceRetrieve.mockResolvedValue(invoice())
  mocks.quoteRetrieve.mockResolvedValue(quote())
  mocks.templateResolve.mockResolvedValue({ data: template, error: null })
  mocks.templateRender.mockResolvedValue({
    data: {
      object: 'email_composition',
      templateId: 'etpl_1',
      senderId: null,
      subject: 'Invoice INV-001 from Acme Logistics',
      html: '<p>Invoice INV-001</p>',
      text: 'Invoice INV-001',
    },
    error: null,
  })
  mocks.senderList.mockResolvedValue({
    data: {
      object: 'list',
      data: [sender],
      has_more: false,
      total_count: 1,
      url: '/senders',
    },
    error: null,
  })
  mocks.deliveryCreate.mockResolvedValue({ data: delivery(), error: null })
  mocks.sendInvoiceWorkflow.mockResolvedValue({
    data: { id: 'inv_1' },
    error: null,
    status: 200,
  })
  mocks.transitionQuoteWorkflow.mockResolvedValue({
    data: { id: 'quo_1' },
    error: null,
    status: 200,
  })
})

describe('prepareDocumentEmail', () => {
  it('prepares an invoice with the default template, sender, and customer email', async () => {
    const result = await prepareDocumentEmail(tenantId, 'invoice', 'inv_1', {})

    expect(result).toMatchObject({
      object: 'document_email_composition',
      resourceType: 'invoice',
      resourceId: 'inv_1',
      sender: { id: 'esnd_1', email: 'billing@example.com' },
      to: [{ email: 'ada@example.com', name: 'Analytical Engines Ltd' }],
      templateId: 'etpl_1',
    })
    expect(mocks.templateResolve).toHaveBeenCalledWith(
      organizationId,
      'invoice',
      {}
    )
  })

  it('uses explicitly requested template and sender ids', async () => {
    await prepareDocumentEmail(tenantId, 'invoice', 'inv_1', {
      templateId: 'etpl_custom',
      senderId: 'esnd_1',
    })

    expect(mocks.templateResolve).toHaveBeenCalledWith(
      organizationId,
      'invoice',
      { templateId: 'etpl_custom' }
    )
  })

  it('passes currency-precision-aware totals to the renderer', async () => {
    mocks.enabledCurrencyDecimalPlaces.mockResolvedValue(0)
    mocks.invoiceRetrieve.mockResolvedValue(invoice({ currency: 'JPY', total: 12345n }))

    await prepareDocumentEmail(tenantId, 'invoice', 'inv_1', {})

    expect(mocks.templateRender).toHaveBeenCalledWith(
      organizationId,
      'etpl_1',
      expect.objectContaining({
        variables: expect.objectContaining({
          currency: 'JPY',
          documentTotal: '12345',
        }),
      })
    )
  })

  it('rejects an invoice with no customer email before provider work', async () => {
    mocks.invoiceRetrieve.mockResolvedValue(
      invoice({ customer: { name: 'Ada', companyName: null, email: null } })
    )

    await expect(
      prepareDocumentEmail(tenantId, 'invoice', 'inv_1', {})
    ).rejects.toMatchObject({ code: 'billing/email-recipient-required' })
    expect(mocks.templateResolve).not.toHaveBeenCalled()
  })

  it('rejects a draft invoice before provider work', async () => {
    mocks.invoiceRetrieve.mockResolvedValue(invoice({ status: 'DRAFT' }))

    await expect(
      prepareDocumentEmail(tenantId, 'invoice', 'inv_1', {})
    ).rejects.toMatchObject({ code: 'invoice/invalid-state' })
    expect(mocks.templateResolve).not.toHaveBeenCalled()
  })

  it('rejects preparation when no active sender can be selected', async () => {
    mocks.senderList.mockResolvedValue({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/senders',
      },
      error: null,
    })

    await expect(
      prepareDocumentEmail(tenantId, 'invoice', 'inv_1', {})
    ).rejects.toMatchObject({ code: 'billing/email-sender-required' })
  })

  it('maps unavailable templates to the Billing email contract', async () => {
    mocks.templateResolve.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/template-not-found',
        message: 'missing',
      },
    })

    await expect(
      prepareDocumentEmail(tenantId, 'invoice', 'inv_1', {})
    ).rejects.toMatchObject({ code: 'billing/email-template-unavailable' })
  })

  it('prepares a sendable quote through the same Communications boundary', async () => {
    mocks.templateResolve.mockResolvedValue({
      data: { ...template, category: 'quote', key: 'billing.quote.default' },
      error: null,
    })

    const result = await prepareDocumentEmail(tenantId, 'quote', 'quo_1', {})

    expect(result.resourceType).toBe('quote')
    expect(mocks.templateResolve).toHaveBeenCalledWith(
      organizationId,
      'quote',
      {}
    )
  })
})

describe('sendDocumentEmail', () => {
  const body = {
    senderId: 'esnd_1',
    templateId: 'etpl_1',
    to: [{ email: 'ada@example.com', name: 'Ada' }],
    cc: [],
    bcc: [],
    subject: 'Invoice INV-001',
    html: '<p>Invoice</p>',
    text: 'Invoice',
  }

  it('does not mutate Billing lifecycle when Communications rejects delivery', async () => {
    mocks.deliveryCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/provider-rejected',
        message: 'provider rejected',
      },
    })

    await expect(
      sendDocumentEmail(tenantId, 'invoice', 'inv_1', body, idempotency)
    ).rejects.toMatchObject({ code: 'billing/email-delivery-failed' })
    expect(mocks.sendInvoiceWorkflow).not.toHaveBeenCalled()
  })

  it('maps Communications idempotency conflicts to Billing conflicts', async () => {
    mocks.deliveryCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/idempotency-conflict',
        message: 'conflict',
      },
    })

    await expect(
      sendDocumentEmail(tenantId, 'invoice', 'inv_1', body, idempotency)
    ).rejects.toMatchObject({ code: 'billing/idempotency-conflict' })
    expect(mocks.sendInvoiceWorkflow).not.toHaveBeenCalled()
  })

  it('records the invoice lifecycle only after provider acceptance', async () => {
    const result = await sendDocumentEmail(
      tenantId,
      'invoice',
      'inv_1',
      body,
      idempotency,
      { actorId: 'user_1' }
    )

    expect(mocks.deliveryCreate).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({
        resourceType: 'invoice',
        resourceId: 'inv_1',
        idempotencyKey: expect.stringMatching(/^billing-email:/),
      }),
      { actorId: 'user_1' }
    )
    expect(mocks.sendInvoiceWorkflow).toHaveBeenCalledWith(
      tenantId,
      'inv_1',
      idempotency
    )
    expect(result).toMatchObject({
      object: 'document_email_delivery',
      deliveryId: 'edel_1',
      providerMessageId: 'msg_1',
    })
  })

  it('uses a deterministic Communications key for retries of one Billing command', async () => {
    await sendDocumentEmail(tenantId, 'invoice', 'inv_1', body, idempotency)
    const firstKey = mocks.deliveryCreate.mock.calls[0]?.[1].idempotencyKey

    mocks.deliveryCreate.mockClear()
    await sendDocumentEmail(tenantId, 'invoice', 'inv_1', body, idempotency)
    const secondKey = mocks.deliveryCreate.mock.calls[0]?.[1].idempotencyKey

    expect(firstKey).toBe(secondKey)
  })

  it('forwards integration source ownership when validating an invoice', async () => {
    await sendDocumentEmail(tenantId, 'invoice', 'inv_1', body, idempotency, {
      sourceAppId: 'app_invoice',
    })

    expect(mocks.invoiceRetrieve).toHaveBeenCalledWith(
      tenantId,
      'inv_1',
      'app_invoice'
    )
  })

  it('records quote send lifecycle after an accepted delivery', async () => {
    const quoteDelivery = { ...delivery(), resourceType: 'quote', resourceId: 'quo_1' }
    mocks.deliveryCreate.mockResolvedValue({ data: quoteDelivery, error: null })

    await sendDocumentEmail(tenantId, 'quote', 'quo_1', body, idempotency)

    expect(mocks.transitionQuoteWorkflow).toHaveBeenCalledWith(
      tenantId,
      'quo_1',
      'send',
      idempotency
    )
  })

  it('rejects an expired quote before creating an external delivery', async () => {
    mocks.quoteRetrieve.mockResolvedValue(quote({ expiresAt: 99 }))

    await expect(
      sendDocumentEmail(tenantId, 'quote', 'quo_1', body, idempotency)
    ).rejects.toMatchObject({ code: 'billing/quote-invalid-state' })
    expect(mocks.deliveryCreate).not.toHaveBeenCalled()
  })
})
