import type { EmailProvider } from '../../providers/email-provider.js'
import * as domainsService from '../domains/domains.service.js'
import * as sendersService from '../senders/senders.service.js'
import * as templatesService from '../templates/templates.service.js'
import * as repository from './deliveries.repository.js'
import {
  createDelivery,
  listDeliveries,
  retrieveDelivery,
} from './deliveries.service.js'

vi.mock('./deliveries.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  retrieveByIdempotencyKey: vi.fn(),
  retrieveByProviderMessageId: vi.fn(),
  createQueued: vi.fn(),
  markRetryQueued: vi.fn(),
  markSent: vi.fn(),
  markFailed: vi.fn(),
  recordProviderEvent: vi.fn(),
}))
vi.mock('../senders/senders.service.js', () => ({ retrieveSender: vi.fn() }))
vi.mock('../domains/domains.service.js', () => ({ retrieveDomain: vi.fn() }))
vi.mock('../templates/templates.service.js', () => ({ retrieveTemplate: vi.fn() }))

const now = BigInt(1_700_000_000)

function sender(overrides: Record<string, unknown> = {}) {
  return {
    object: 'email_sender' as const,
    id: 'esnd_1',
    organizationId: 'org_1',
    domainId: 'edom_1',
    name: 'Acme Billing',
    email: 'billing@mail.acme.com',
    replyTo: 'accounts@acme.com',
    kind: 'custom-domain' as const,
    isDefault: true,
    isActive: true,
    createdAt: Number(now),
    updatedAt: Number(now),
    ...overrides,
  }
}

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'edel_1',
    organizationId: 'org_1',
    resourceType: 'invoice',
    resourceId: 'inv_1',
    templateId: null,
    senderId: 'esnd_1',
    provider: 'resend',
    providerMessageId: null,
    idempotencyKey: 'invoice:inv_1:send:1',
    fromName: 'Acme Billing',
    fromEmail: 'billing@mail.acme.com',
    replyTo: 'accounts@acme.com',
    toRecipients: [{ email: 'jane@example.com', name: 'Jane' }],
    ccRecipients: [],
    bccRecipients: [],
    subject: 'Invoice INV-1',
    html: '<p>Invoice</p>',
    text: null,
    status: 'queued',
    providerMetadata: null,
    failureCode: null,
    failureMessage: null,
    createdBy: 'usr_1',
    queuedAt: now,
    sentAt: null,
    deliveredAt: null,
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    complainedAt: null,
    failedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    senderId: 'esnd_1',
    to: [{ email: 'jane@example.com', name: 'Jane' }],
    cc: [],
    bcc: [],
    subject: 'Invoice INV-1',
    html: '<p>Invoice</p>',
    resourceType: 'invoice',
    resourceId: 'inv_1',
    idempotencyKey: 'invoice:inv_1:send:1',
    ...overrides,
  }
}

function provider(): EmailProvider {
  return {
    name: 'resend',
    createDomain: vi.fn(),
    retrieveDomain: vi.fn(),
    verifyDomain: vi.fn(),
    deleteDomain: vi.fn(),
    send: vi.fn().mockResolvedValue({ providerMessageId: 'email_1' }),
  }
}

beforeEach(() => {
  vi.mocked(sendersService.retrieveSender).mockResolvedValue({
    data: sender(),
    error: null,
  })
  vi.mocked(domainsService.retrieveDomain).mockResolvedValue({
    data: {
      object: 'email_domain',
      id: 'edom_1',
      organizationId: 'org_1',
      provider: 'resend',
      name: 'mail.acme.com',
      region: null,
      status: 'verified',
      records: [],
      verifiedAt: 1,
      lastCheckedAt: 1,
      createdAt: 1,
      updatedAt: 1,
    },
    error: null,
  })
  vi.mocked(templatesService.retrieveTemplate).mockResolvedValue({
    data: {
      object: 'email_template',
      id: 'etpl_1',
      organizationId: 'org_1',
      key: 'invoice.notification',
      name: 'Invoice',
      category: 'invoice.notification',
      subject: 'Invoice',
      html: '<p>Invoice</p>',
      text: null,
      senderId: null,
      isDefault: true,
      isSystem: false,
      isActive: true,
      createdAt: 1,
      updatedAt: 1,
    },
    error: null,
  })
  vi.mocked(repository.retrieveByIdempotencyKey).mockResolvedValue(null)
})

describe('createDelivery', () => {
  it('creates a queued record before sending and then marks it sent', async () => {
    const queued = deliveryRow()
    vi.mocked(repository.createQueued).mockResolvedValue(queued as never)
    vi.mocked(repository.markSent).mockResolvedValue(
      deliveryRow({ status: 'sent', providerMessageId: 'email_1', sentAt: now }) as never
    )
    const emailProvider = provider()

    const result = await createDelivery('org_1', input(), 'usr_1', emailProvider)

    expect(repository.createQueued).toHaveBeenCalledOnce()
    expect(emailProvider.send).toHaveBeenCalledOnce()
    expect(repository.markSent).toHaveBeenCalledWith(
      expect.objectContaining({ providerMessageId: 'email_1' })
    )
    expect(result.data?.status).toBe('sent')
  })

  it('returns an existing accepted delivery without sending again', async () => {
    vi.mocked(repository.retrieveByIdempotencyKey).mockResolvedValue(
      deliveryRow({ status: 'sent', providerMessageId: 'email_1', sentAt: now }) as never
    )
    const emailProvider = provider()

    const result = await createDelivery('org_1', input(), 'usr_1', emailProvider)

    expect(emailProvider.send).not.toHaveBeenCalled()
    expect(result.data?.providerMessageId).toBe('email_1')
  })

  it('rejects an idempotency key reused with a changed subject', async () => {
    vi.mocked(repository.retrieveByIdempotencyKey).mockResolvedValue(
      deliveryRow({ status: 'sent', providerMessageId: 'email_1' }) as never
    )

    const result = await createDelivery(
      'org_1',
      input({ subject: 'Different invoice' }),
      'usr_1',
      provider()
    )

    expect(result.error?.code).toBe('communications/idempotency-conflict')
  })

  it('retries a failed delivery with the same provider idempotency key', async () => {
    const failed = deliveryRow({ status: 'failed', failedAt: now })
    const queued = deliveryRow({ status: 'queued' })
    vi.mocked(repository.retrieveByIdempotencyKey).mockResolvedValue(failed as never)
    vi.mocked(repository.markRetryQueued).mockResolvedValue(queued as never)
    vi.mocked(repository.markSent).mockResolvedValue(
      deliveryRow({ status: 'sent', providerMessageId: 'email_1', sentAt: now }) as never
    )
    const emailProvider = provider()

    await createDelivery('org_1', input(), 'usr_1', emailProvider)

    expect(emailProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'invoice:inv_1:send:1' })
    )
  })

  it('retries a queued delivery that has no provider message id', async () => {
    const queued = deliveryRow({ status: 'queued' })
    vi.mocked(repository.retrieveByIdempotencyKey).mockResolvedValue(queued as never)
    vi.mocked(repository.markRetryQueued).mockResolvedValue(queued as never)
    vi.mocked(repository.markSent).mockResolvedValue(
      deliveryRow({ status: 'sent', providerMessageId: 'email_1', sentAt: now }) as never
    )

    const emailProvider = provider()
    await createDelivery('org_1', input(), 'usr_1', emailProvider)

    expect(emailProvider.send).toHaveBeenCalledOnce()
  })

  it('stops when the sender does not exist', async () => {
    vi.mocked(sendersService.retrieveSender).mockResolvedValue({
      data: null,
      error: {
        code: 'communications/sender-not-found',
        message: 'The sender identity could not be found.',
        httpStatus: 404,
      },
    })

    const result = await createDelivery('org_1', input(), 'usr_1', provider())

    expect(result.error?.code).toBe('communications/sender-not-found')
    expect(repository.createQueued).not.toHaveBeenCalled()
  })

  it('stops when the sender is inactive', async () => {
    vi.mocked(sendersService.retrieveSender).mockResolvedValue({
      data: sender({ isActive: false }),
      error: null,
    })

    const result = await createDelivery('org_1', input(), 'usr_1', provider())

    expect(result.error?.code).toBe('communications/sender-not-found')
  })

  it('stops when the custom sending domain is no longer verified', async () => {
    vi.mocked(domainsService.retrieveDomain).mockResolvedValue({
      data: {
        object: 'email_domain',
        id: 'edom_1',
        organizationId: 'org_1',
        provider: 'resend',
        name: 'mail.acme.com',
        region: null,
        status: 'failed',
        records: [],
        verifiedAt: null,
        lastCheckedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
      error: null,
    })

    const result = await createDelivery('org_1', input(), 'usr_1', provider())

    expect(result.error?.code).toBe('communications/sender-domain-not-verified')
  })

  it('stops when an explicitly referenced template does not exist', async () => {
    vi.mocked(templatesService.retrieveTemplate).mockResolvedValue({
      data: null,
      error: {
        code: 'communications/template-not-found',
        message: 'The email template could not be found.',
        httpStatus: 404,
      },
    })

    const result = await createDelivery(
      'org_1',
      input({ templateId: 'etpl_missing' }),
      'usr_1',
      provider()
    )

    expect(result.error?.code).toBe('communications/template-not-found')
  })

  it('records a normalized provider failure on the delivery', async () => {
    const queued = deliveryRow()
    vi.mocked(repository.createQueued).mockResolvedValue(queued as never)
    vi.mocked(repository.markFailed).mockResolvedValue(
      deliveryRow({
        status: 'failed',
        failureCode: 'communications/provider-unavailable',
        failureMessage: 'Email delivery is temporarily unavailable.',
        failedAt: now,
      }) as never
    )
    const emailProvider = provider()
    vi.mocked(emailProvider.send).mockRejectedValue(new Error('network down'))

    const result = await createDelivery('org_1', input(), 'usr_1', emailProvider)

    expect(repository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCode: 'communications/provider-unavailable',
      })
    )
    expect(result.error?.code).toBe('communications/provider-unavailable')
  })

  it('recovers a concurrent create that used the same message', async () => {
    const raced = deliveryRow({ status: 'sent', providerMessageId: 'email_1', sentAt: now })
    vi.mocked(repository.createQueued).mockRejectedValue(new Error('unique constraint'))
    vi.mocked(repository.retrieveByIdempotencyKey)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raced as never)
    const emailProvider = provider()

    const result = await createDelivery('org_1', input(), 'usr_1', emailProvider)

    expect(result.data?.providerMessageId).toBe('email_1')
    expect(emailProvider.send).not.toHaveBeenCalled()
  })
})

describe('delivery queries', () => {
  it('lists organization-scoped deliveries', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      deliveryRow({ status: 'sent', providerMessageId: 'email_1' }),
    ] as never)

    const result = await listDeliveries('org_1')

    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]?.organizationId).toBe('org_1')
  })

  it('returns a registered not-found error for a missing delivery', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)

    const result = await retrieveDelivery('org_1', 'edel_missing')

    expect(result.error?.code).toBe('communications/delivery-not-found')
  })
})
