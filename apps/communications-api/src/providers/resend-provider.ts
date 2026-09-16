import { z } from 'zod'

import {
  EmailProviderError,
  type CreateProviderDomainInput,
  type EmailProvider,
  type ProviderDomain,
  type ProviderDomainStatus,
  type ProviderSendInput,
  type ProviderSendResult,
} from './email-provider.js'

const resendDomainRecordSchema = z.object({
  name: z.string(),
  type: z.string(),
  value: z.string(),
  status: z.string().optional(),
  ttl: z.union([z.string(), z.number()]).optional(),
  priority: z.number().optional(),
})

const resendDomainSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  region: z.string().nullable().optional(),
  records: z.array(resendDomainRecordSchema).default([]),
})

const resendSendSchema = z.object({ id: z.string() })

type FetchLike = typeof fetch

function mapDomainStatus(status: string): ProviderDomainStatus {
  switch (status) {
    case 'verified':
      return 'verified'
    case 'failure':
      return 'failed'
    case 'temporary_failure':
      return 'temporary-failure'
    default:
      return 'pending'
  }
}

function normalizeDomain(value: z.infer<typeof resendDomainSchema>): ProviderDomain {
  return {
    providerDomainId: value.id,
    name: value.name,
    region: value.region ?? null,
    status: mapDomainStatus(value.status),
    records: value.records.map((record) => ({
      name: record.name,
      type: record.type,
      value: record.value,
      ...(record.status ? { status: record.status } : {}),
      ...(record.ttl !== undefined ? { ttl: String(record.ttl) } : {}),
      ...(record.priority !== undefined ? { priority: record.priority } : {}),
    })),
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: FetchLike = fetch,
    private readonly baseUrl = 'https://api.resend.com'
  ) {
    if (!apiKey.trim()) throw new Error('RESEND_API_KEY is not configured.')
  }

  async createDomain(input: CreateProviderDomainInput): Promise<ProviderDomain> {
    const response = await this.request('/domains', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        ...(input.region ? { region: input.region } : {}),
      }),
    })
    return normalizeDomain(this.parse(resendDomainSchema, response))
  }

  async retrieveDomain(providerDomainId: string): Promise<ProviderDomain> {
    const response = await this.request(`/domains/${providerDomainId}`)
    return normalizeDomain(this.parse(resendDomainSchema, response))
  }

  async verifyDomain(providerDomainId: string): Promise<void> {
    await this.request(`/domains/${providerDomainId}/verify`, { method: 'POST' })
  }

  async deleteDomain(providerDomainId: string): Promise<void> {
    await this.request(`/domains/${providerDomainId}`, { method: 'DELETE' })
  }

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const response = await this.request('/emails', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        ...(input.cc?.length ? { cc: input.cc } : {}),
        ...(input.bcc?.length ? { bcc: input.bcc } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.tags?.length ? { tags: input.tags } : {}),
      }),
    })
    const parsed = this.parse(resendSendSchema, response)
    return { providerMessageId: parsed.id }
  }

  private async request(
    path: string,
    init: RequestInit = {}
  ): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchFn(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network failure'
      throw new EmailProviderError('unavailable', message)
    }

    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }

    if (!response.ok) {
      throw new EmailProviderError(
        response.status >= 500 ? 'unavailable' : 'rejected',
        `Resend request failed with HTTP ${response.status}.`,
        response.status
      )
    }

    return body
  }

  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      throw new EmailProviderError(
        'invalid-response',
        'Resend returned an unexpected response.'
      )
    }
    return parsed.data
  }
}
