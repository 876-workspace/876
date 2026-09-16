import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876CommunicationsClient } from './client'
import { buildRuntime } from './runtime'
import { create876CommunicationsServiceClient } from './service'
import { createEmailDeliverySchema } from './types'

const domain = {
  object: 'email_domain',
  id: 'edom_1',
  organizationId: 'org_1',
  provider: 'resend',
  name: 'mail.example.com',
  region: null,
  status: 'verified',
  records: [],
  verifiedAt: 100,
  lastCheckedAt: 100,
  createdAt: 100,
  updatedAt: 100,
}

const delivery = {
  object: 'email_delivery',
  id: 'edel_1',
  organizationId: 'org_1',
  resourceType: 'invoice',
  resourceId: 'inv_1',
  templateId: null,
  senderId: 'esnd_1',
  provider: 'resend',
  providerMessageId: 'msg_1',
  idempotencyKey: 'invoice:inv_1:1',
  fromName: 'Acme',
  fromEmail: 'billing@example.com',
  replyTo: null,
  to: [{ email: 'customer@example.com' }],
  cc: [],
  bcc: [],
  subject: 'Invoice INV-1',
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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('@876/communications client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.COMMUNICATIONS_API_URL
    delete process.env.COMMUNICATIONS_INTERNAL_KEY
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('exposes only the bounded communications resources', () => {
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'key_1',
    })

    expect(Object.keys(client).sort()).toEqual([
      'deliveries',
      'domains',
      'senders',
      'templates',
    ])
  })

  it('resolves the service URL and key from environment variables', () => {
    process.env.COMMUNICATIONS_API_URL = 'https://env.test/'
    process.env.COMMUNICATIONS_INTERNAL_KEY = 'env-key'

    const runtime = buildRuntime({})
    expect(runtime.baseUrl).toBe('https://env.test')
    expect(runtime.internalKey).toBe('env-key')
  })

  it('prefers an explicit base URL and strips a trailing slash', () => {
    process.env.COMMUNICATIONS_API_URL = 'https://env.test'
    const runtime = buildRuntime({ baseUrl: 'https://explicit.test/' })
    expect(runtime.baseUrl).toBe('https://explicit.test')
  })

  it('does not invent a localhost URL when configuration is absent', () => {
    const runtime = buildRuntime({})
    expect(runtime.baseUrl).toBeUndefined()
  })

  it('returns communications/not-configured without a service URL', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const client = create876CommunicationsClient({
      internalKey: 'key_1',
      fetch,
    })

    const result = await client.domains.retrieve('org_1', 'edom_1')
    expect(result).toEqual({
      data: null,
      error: {
        code: 'communications/not-configured',
        message: 'The Communications client is not configured.',
      },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns communications/not-configured without an internal key', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      fetch,
    })

    const result = await client.domains.retrieve('org_1', 'edom_1')
    expect(result.error?.code).toBe('communications/not-configured')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the internal key, request id, and default actor id', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: domain, error: null }))
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      requestId: 'req_1',
      actorId: 'user_1',
      fetch,
    })

    const result = await client.domains.retrieve('org_1', 'edom_1')
    expect(result.data).toEqual(domain)
    expect(fetch).toHaveBeenCalledWith(
      'https://communications.test/v1/organizations/org_1/email/domains/edom_1',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-id': 'user_1',
          'x-internal-key': 'service-key',
          'x-request-id': 'req_1',
        },
      }
    )
  })

  it('allows a per-request actor id to override the client default', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      jsonResponse({
        data: { object: 'email_domain', id: 'edom_1', deleted: true },
        error: null,
      })
    )
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      actorId: 'user_default',
      fetch,
    })

    await client.domains.delete('org_1', 'edom_1', { actorId: 'user_override' })
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-actor-id': 'user_override' }),
      })
    )
  })

  it('propagates registered service errors as values', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      jsonResponse(
        {
          data: null,
          error: {
            code: 'communications/domain-not-found',
            message: 'The sending domain could not be found.',
          },
        },
        404
      )
    )
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      fetch,
    })

    const result = await client.domains.retrieve('org_1', 'missing')
    expect(result).toEqual({
      data: null,
      error: {
        code: 'communications/domain-not-found',
        message: 'The sending domain could not be found.',
      },
    })
  })

  it('returns communications/invalid-response for an invalid envelope', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ nope: true }))
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      fetch,
    })

    const result = await client.domains.retrieve('org_1', 'edom_1')
    expect(result.error?.code).toBe('communications/invalid-response')
  })

  it('returns communications/invalid-response when success data violates the contract', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ data: { object: 'wrong' }, error: null })
      )
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      fetch,
    })

    const result = await client.domains.retrieve('org_1', 'edom_1')
    expect(result.error?.code).toBe('communications/invalid-response')
  })

  it('encodes organization ids and validates list envelopes', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      jsonResponse({
        data: {
          object: 'list',
          data: [domain],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org%2Fwith%2Fslash/email/domains',
        },
        error: null,
      })
    )
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      fetch,
    })

    const result = await client.domains.list('org/with/slash')
    expect(result.data?.data).toHaveLength(1)
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://communications.test/v1/organizations/org%2Fwith%2Fslash/email/domains'
    )
  })

  it('renders templates through the explicit render workflow', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      jsonResponse({
        data: {
          object: 'email_composition',
          templateId: 'etpl_1',
          senderId: null,
          subject: 'Invoice INV-1',
          html: '<p>INV-1</p>',
          text: 'INV-1',
        },
        error: null,
      })
    )
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      fetch,
    })

    const result = await client.templates.render('org_1', 'etpl_1', {
      variables: { invoiceNumber: 'INV-1' },
    })
    expect(result.data?.subject).toBe('Invoice INV-1')
    expect(fetch).toHaveBeenCalledWith(
      'https://communications.test/v1/organizations/org_1/email/templates/etpl_1/render',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ variables: { invoiceNumber: 'INV-1' } }),
      })
    )
  })

  it('creates deliveries with the resource and idempotency snapshot intact', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: delivery, error: null }, 201))
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      fetch,
    })

    const result = await client.deliveries.create('org_1', {
      senderId: 'esnd_1',
      to: [{ email: 'customer@example.com' }],
      subject: 'Invoice INV-1',
      html: '<p>Invoice</p>',
      resourceType: 'invoice',
      resourceId: 'inv_1',
      idempotencyKey: 'invoice:inv_1:1',
    })

    expect(result.data?.providerMessageId).toBe('msg_1')
    expect(fetch).toHaveBeenCalledWith(
      'https://communications.test/v1/organizations/org_1/email/deliveries',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('adds the delivery limit as a query parameter', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      jsonResponse({
        data: {
          object: 'list',
          data: [delivery],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_1/email/deliveries?limit=25',
        },
        error: null,
      })
    )
    const client = create876CommunicationsClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
      fetch,
    })

    await client.deliveries.list('org_1', { limit: 25 })
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://communications.test/v1/organizations/org_1/email/deliveries?limit=25'
    )
  })

  it('the service entrypoint exposes the same bounded resource surface', () => {
    const service = create876CommunicationsServiceClient({
      baseUrl: 'https://communications.test',
      internalKey: 'service-key',
    })
    expect(Object.keys(service).sort()).toEqual([
      'deliveries',
      'domains',
      'senders',
      'templates',
    ])
  })
})

describe('createEmailDeliverySchema recipient bounds', () => {
  function recipients(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      email: `customer${index}@example.com`,
    }))
  }

  const base = {
    senderId: 'esnd_1',
    subject: 'Invoice INV-1042',
    html: '<p>Invoice</p>',
    idempotencyKey: 'key_1',
  }

  it('accepts a send at exactly the documented recipient maximum', () => {
    const result = createEmailDeliverySchema.safeParse({
      ...base,
      to: recipients(50),
    })

    expect(result.success).toBe(true)
  })

  it('rejects more recipients across to, cc and bcc than one send may address', () => {
    // Resend counts every to/cc/bcc address separately against the quota, so 150
    // addresses would be billed as 150 emails and exceed the documented bound.
    const result = createEmailDeliverySchema.safeParse({
      ...base,
      to: recipients(50),
      cc: recipients(50),
      bcc: recipients(50),
    })

    expect(result.success).toBe(false)
  })

  it('rejects a combined total over the maximum even when each list is legal', () => {
    const result = createEmailDeliverySchema.safeParse({
      ...base,
      to: recipients(30),
      cc: recipients(21),
    })

    expect(result.success).toBe(false)
  })

  it('accepts a combined total at the maximum split across lists', () => {
    const result = createEmailDeliverySchema.safeParse({
      ...base,
      to: recipients(30),
      cc: recipients(15),
      bcc: recipients(5),
    })

    expect(result.success).toBe(true)
  })

  it('requires at least one recipient', () => {
    const result = createEmailDeliverySchema.safeParse({ ...base, to: [] })

    expect(result.success).toBe(false)
  })

  it('rejects an idempotency key longer than the provider accepts', () => {
    const result = createEmailDeliverySchema.safeParse({
      ...base,
      to: recipients(1),
      idempotencyKey: 'k'.repeat(257),
    })

    expect(result.success).toBe(false)
  })

  it('defaults cc and bcc to empty arrays so a caller may omit them', () => {
    const result = createEmailDeliverySchema.safeParse({
      ...base,
      to: recipients(1),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cc).toEqual([])
      expect(result.data.bcc).toEqual([])
    }
  })
})
