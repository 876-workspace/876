import { z } from 'zod'

import { sendRequest } from '../transport'
import type { Result } from '../types'

const pickupPackageSchema = z.object({
  object: z.literal('kiosk_package'),
  id: z.string(),
  tracking_number: z.string().nullable(),
  description: z.string().nullable(),
  status: z.enum(['READY_FOR_PICKUP', 'COLLECTED']),
  quantity: z.number().int(),
})
const pickupListSchema = z.object({
  object: z.literal('list'),
  data: z.array(pickupPackageSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type KioskPackage = z.infer<typeof pickupPackageSchema>
export type KioskClientOptions = {
  baseUrl: string
  credential: string
  fetch?: typeof fetch
}

/** Browser-safe client for an enrolled counter device; it never accepts app or admin credentials. */
export function create876CouriersKioskClient(options: KioskClientOptions) {
  const request = <T>(
    method: 'GET' | 'POST',
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    query?: Record<string, string>
  ) =>
    sendRequest<T>(
      {
        baseUrl: options.baseUrl.replace(/\/$/, ''),
        fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
        headers: { authorization: `Bearer ${options.credential}` },
      },
      { method, path, body, query },
      schema
    )
  return {
    packages: {
      lookup(
        mailboxNumber: string,
        pickupCode: string
      ): Promise<Result<z.infer<typeof pickupListSchema>>> {
        return request(
          'GET',
          '/v1/kiosk/packages/lookup',
          pickupListSchema,
          undefined,
          { mailbox_number: mailboxNumber, pickup_code: pickupCode }
        )
      },
      collect(id: string, pickupCode: string): Promise<Result<KioskPackage>> {
        return request(
          'POST',
          `/v1/kiosk/packages/${encodeURIComponent(id)}/collect`,
          pickupPackageSchema,
          { pickup_code: pickupCode }
        )
      },
    },
  }
}
