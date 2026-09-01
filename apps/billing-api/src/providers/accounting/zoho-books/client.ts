import { z } from 'zod'

import type { AccountingProviderContext } from '../types'
import { classifyZohoHttpError, ZohoBooksError } from './errors'

const responseBaseSchema = z.object({
  code: z.number(),
  message: z.string(),
}).passthrough()

export class ZohoBooksClient {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async request<T>(params: {
    ctx: AccountingProviderContext
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    body?: unknown
    schema: z.ZodType<T>
    query?: Record<string, string | number | boolean | undefined>
  }): Promise<T> {
    const root = params.ctx.apiDomain.replace(/\/+$/, '')
    const url = new URL(`${root}/books/v4${params.path}`)
    url.searchParams.set('organization_id', params.ctx.providerOrganizationId)
    for (const [key, value] of Object.entries(params.query ?? {}))
      if (value !== undefined) url.searchParams.set(key, String(value))

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: params.method,
        headers: {
          Authorization: `Zoho-oauthtoken ${params.ctx.accessToken}`,
          Accept: 'application/json',
          ...(params.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        body: params.body === undefined ? undefined : JSON.stringify(params.body),
      })
    } catch (error) {
      throw new ZohoBooksError({
        code: 'billing/provider-unavailable',
        message: 'Zoho Books could not be reached.',
        retryable: true,
        cause: error,
      })
    }

    const raw: unknown = await response.json().catch(() => ({}))
    const base = responseBaseSchema.safeParse(raw)
    const providerCode = base.success ? String(base.data.code) : ''
    const providerMessage = base.success ? base.data.message : ''
    if (!response.ok || (base.success && base.data.code !== 0))
      throw classifyZohoHttpError(
        response.status,
        providerCode,
        providerMessage
      )

    const parsed = params.schema.safeParse(raw)
    if (!parsed.success)
      throw new ZohoBooksError({
        code: 'billing/provider-invalid-response',
        message: 'Zoho Books returned an unexpected response shape.',
        httpStatus: response.status,
        retryable: false,
      })
    return parsed.data
  }
}
