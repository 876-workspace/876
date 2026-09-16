import { EmailProviderError } from './email-provider.js'
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
          { name: 'send', type: 'MX', value: 'feedback-smtp.us-east-1.amazonses.com', priority: 10 },
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
      status: 'pending',
      records: [
        { name: 'send', type: 'MX', value: 'feedback-smtp.us-east-1.amazonses.com', priority: 10 },
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
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
    ).rejects.toMatchObject<Partial<EmailProviderError>>({ kind: 'unavailable' })
  })

  it('maps a provider validation response to rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'bad' }, 422))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await expect(provider.createDomain({ name: 'mail.acme.com' })).rejects.toMatchObject({
      kind: 'rejected',
      status: 422,
    })
  })

  it('maps a provider server response to unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'down' }, 503))
    const provider = new ResendEmailProvider(
      're_test',
      fetchMock as unknown as typeof fetch,
      'https://example.test'
    )

    await expect(provider.createDomain({ name: 'mail.acme.com' })).rejects.toMatchObject({
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

    await expect(provider.createDomain({ name: 'mail.acme.com' })).rejects.toMatchObject({
      kind: 'invalid-response',
    })
  })
})
