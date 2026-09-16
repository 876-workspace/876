import { ResendEmailProvider } from './resend-provider.js'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('ResendEmailProvider', () => {
  it('creates and normalizes a sending domain', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: 'domain_1',
        name: 'mail.acme.com',
        status: 'not_started',
        region: 'us-east-1',
        records: [
          {
            name: 'send',
            type: 'MX',
            value: 'feedback-smtp.us-east-1.amazonses.com',
            priority: 10,
          },
        ],
      })
    )
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    const domain = await provider.createDomain({ name: 'mail.acme.com' })

    expect(domain).toEqual({
      providerDomainId: 'domain_1',
      name: 'mail.acme.com',
      region: 'us-east-1',
      // Resend reports `not_started` until Verify is requested. It is distinct
      // from `pending`: the organization must act rather than wait.
      status: 'not-started',
      records: [
        {
          name: 'send',
          type: 'MX',
          value: 'feedback-smtp.us-east-1.amazonses.com',
          priority: 10,
        },
      ],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/domains',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('retrieves and maps a verified domain', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: 'domain_1',
        name: 'mail.acme.com',
        status: 'verified',
        records: [],
      })
    )
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await expect(provider.retrieveDomain('domain_1')).resolves.toMatchObject({
      providerDomainId: 'domain_1',
      status: 'verified',
    })
  })

  it('requests domain verification', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await provider.verifyDomain('domain_1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/domains/domain_1/verify',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('deletes a provider domain', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await provider.deleteDomain('domain_1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/domains/domain_1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('sends with provider idempotency and normalized reply-to', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'email_1' }))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    const result = await provider.send({
      from: 'Acme <billing@mail.acme.com>',
      to: ['Jane <jane@example.com>'],
      cc: [],
      bcc: [],
      replyTo: 'accounts@acme.com',
      subject: 'Invoice INV-1',
      html: '<p>Hello</p>',
      idempotencyKey: 'invoice:inv_1:send:1',
    })

    expect(result).toEqual({ providerMessageId: 'email_1' })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toEqual(
      expect.objectContaining({ 'Idempotency-Key': 'invoice:inv_1:send:1' })
    )
    expect(JSON.parse(String(init.body))).toEqual(
      expect.objectContaining({ reply_to: 'accounts@acme.com' })
    )
  })

  it('maps a transport failure to unavailable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('socket closed'))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await expect(
      provider.send({
        from: 'billing@mail.acme.com',
        to: ['jane@example.com'],
        subject: 'Invoice',
        html: '<p>Invoice</p>',
        idempotencyKey: 'key',
      })
    ).rejects.toMatchObject({ kind: 'unavailable' })
  })

  it('maps a provider validation response to rejected', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'bad' }, 422))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await expect(
      provider.createDomain({ name: 'mail.acme.com' })
    ).rejects.toMatchObject({
      kind: 'rejected',
      status: 422,
    })
  })

  it('maps a provider server response to unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'down' }, 503))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await expect(
      provider.createDomain({ name: 'mail.acme.com' })
    ).rejects.toMatchObject({
      kind: 'unavailable',
      status: 503,
    })
  })

  it('rejects an unexpected provider response shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ nope: true }))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await expect(
      provider.createDomain({ name: 'mail.acme.com' })
    ).rejects.toMatchObject({
      kind: 'invalid-response',
    })
  })
})

describe('Resend domain status mapping', () => {
  // Regression: the mapping previously used the invented values 'failure' and
  // 'temporary_failure', neither of which Resend documents. A domain Resend
  // reported as `failed` fell through to the default and was returned as
  // `pending` — a terminal, actionable error shown as "still working" forever.
  it.each([
    ['not_started', 'not-started'],
    ['pending', 'pending'],
    ['verified', 'verified'],
    ['partially_verified', 'partially-verified'],
    ['partially_failed', 'partially-failed'],
    ['failed', 'failed'],
  ])(
    'maps the documented status %s to %s',
    async (providerStatus, expected) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'domain_1',
            name: 'mail.acme.com',
            status: providerStatus,
            records: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      const provider = new ResendEmailProvider(
        're_test',
        fetchMock as unknown as typeof fetch,
        'https://example.test'
      )

      const domain = await provider.retrieveDomain('domain_1')

      expect(domain.status).toBe(expected)
    }
  )

  it('never reports a failed domain as pending', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'domain_1',
          name: 'mail.acme.com',
          status: 'failed',
          records: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    const domain = await provider.retrieveDomain('domain_1')

    expect(domain.status).not.toBe('pending')
    expect(domain.status).toBe('failed')
  })

  it('preserves each DNS record purpose alongside its DNS type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'domain_1',
          name: 'mail.acme.com',
          status: 'pending',
          records: [
            {
              record: 'SPF',
              name: 'send',
              type: 'MX',
              value: 'feedback-smtp',
              priority: 10,
            },
            {
              record: 'SPF',
              name: 'send',
              type: 'TXT',
              value: 'v=spf1 include:amazonses.com ~all',
            },
            {
              record: 'DKIM',
              name: 'resend._domainkey',
              type: 'TXT',
              value: 'p=MIGf',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    const domain = await provider.retrieveDomain('domain_1')

    expect(domain.records.map((record) => record.purpose)).toEqual([
      'SPF',
      'SPF',
      'DKIM',
    ])
    // The two SPF rows share a name and differ only by DNS type, which is
    // exactly why `purpose` cannot be inferred from the other fields.
    expect(domain.records[0]?.name).toBe(domain.records[1]?.name)
    expect(domain.records[0]?.type).not.toBe(domain.records[1]?.type)
  })
})

describe('Resend provider error classification', () => {
  async function failingProvider(status: number, body: unknown) {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    )
    return new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )
  }

  const send = {
    from: 'Acme <acme@mail.87six.dev>',
    to: ['customer@example.com'],
    subject: 'Invoice INV-1042',
    html: '<p>Invoice</p>',
    idempotencyKey: 'key_1',
  }

  it('preserves the provider error code for a restricted API key', async () => {
    const provider = await failingProvider(401, {
      name: 'restricted_api_key',
      message: 'This API key is restricted to only send emails',
      statusCode: 401,
    })

    await expect(provider.send(send)).rejects.toMatchObject({
      kind: 'rejected',
      status: 401,
      providerCode: 'restricted_api_key',
      retryable: false,
    })
  })

  it('marks a rate limit retryable', async () => {
    const provider = await failingProvider(429, {
      name: 'rate_limit_exceeded',
      message: 'Too many requests.',
      statusCode: 429,
    })

    await expect(provider.send(send)).rejects.toMatchObject({
      status: 429,
      providerCode: 'rate_limit_exceeded',
      retryable: true,
    })
  })

  it('does not mark an exhausted daily quota retryable despite sharing status 429', async () => {
    const provider = await failingProvider(429, {
      name: 'daily_quota_exceeded',
      message: 'Daily quota reached.',
      statusCode: 429,
    })

    await expect(provider.send(send)).rejects.toMatchObject({
      status: 429,
      providerCode: 'daily_quota_exceeded',
      retryable: false,
    })
  })

  it('treats a 5xx as retryable and unavailable even with no parsable body', async () => {
    const provider = await failingProvider(503, 'upstream failure')

    await expect(provider.send(send)).rejects.toMatchObject({
      kind: 'unavailable',
      status: 503,
      retryable: true,
    })
  })

  it('classifies an unverified-domain rejection as terminal', async () => {
    const provider = await failingProvider(403, {
      name: 'validation_error',
      message: 'The domain is not verified.',
      statusCode: 403,
    })

    await expect(provider.send(send)).rejects.toMatchObject({
      kind: 'rejected',
      providerCode: 'validation_error',
      retryable: false,
    })
  })
})
