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
  // The DNS record kind (MX | TXT | CNAME | CAA).
  type: z.string(),
  value: z.string(),
  // Resend's `record` is the record's *purpose* (SPF | DKIM | Receiving |
  // Tracking | TrackingCAA), which is what a setup screen needs in order to
  // label rows — `type` alone cannot distinguish them.
  record: z.string().optional(),
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

/**
 * Resend's documented domain-status values, verified against its OpenAPI
 * document on 2026-09-16:
 * `not_started | pending | verified | partially_verified | partially_failed | failed`.
 *
 * An unrecognized value maps to `pending` only as a last resort. Never map a
 * terminal failure to `pending` — that turns an actionable configuration error
 * into an indistinguishable "still working" state and makes any polling loop
 * keyed on a non-terminal status run forever.
 */
const DOMAIN_STATUSES: Record<string, ProviderDomainStatus> = {
  not_started: 'not-started',
  pending: 'pending',
  verified: 'verified',
  partially_verified: 'partially-verified',
  partially_failed: 'partially-failed',
  failed: 'failed',
}

function mapDomainStatus(status: string): ProviderDomainStatus {
  return DOMAIN_STATUSES[status.trim().toLowerCase()] ?? 'pending'
}

const resendErrorBodySchema = z.object({
  name: z.string().optional(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
})

/**
 * 429 covers both a transient rate limit and an exhausted quota. Only the
 * provider's error `name` distinguishes them, and retrying an exhausted quota is
 * pointless until its window resets.
 */
const RETRYABLE_PROVIDER_CODES = new Set([
  'rate_limit_exceeded',
  'concurrent_idempotent_requests',
  'internal_server_error',
])

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
      ...(record.record ? { purpose: record.record } : {}),
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
      // The body is already in memory, so preserving the provider's machine code
      // costs nothing and is the only thing that distinguishes a misconfigured
      // credential from an unverified domain from an exhausted quota.
      const parsedError = resendErrorBodySchema.safeParse(body)
      const providerCode = parsedError.success ? parsedError.data.name : undefined
      const retryable =
        response.status >= 500 ||
        (providerCode !== undefined &&
          RETRYABLE_PROVIDER_CODES.has(providerCode))

      throw new EmailProviderError(
        response.status >= 500 ? 'unavailable' : 'rejected',
        `Resend request failed with HTTP ${response.status}.`,
        response.status,
        providerCode,
        retryable
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
