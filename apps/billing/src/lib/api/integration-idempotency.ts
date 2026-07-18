import 'server-only'

import { createHash } from 'node:crypto'
import { apiError } from '@876/core/api'
import { z } from 'zod'

import type { IntegrationAttribution } from '@/lib/service/integrations/attribution'

import type { IntegrationAccess } from './integration-route'

const SourceExternalReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .nullable()
  .optional()

type ParsedIntegrationBody<T> =
  | {
      data: { params: T; sourceExternalReference: string | null }
      response: null
    }
  | { data: null; response: Response }

type AttributionAccess = Pick<
  Extract<IntegrationAccess, { response: null }>,
  'platformAdmin' | 'sourceAppId'
>

type AttributionResult =
  | { data: IntegrationAttribution | null; response: null }
  | { data: null; response: Response }

/** Separates integration-only origin data before domain validation. */
export function parseIntegrationCreateBody<T>(
  body: unknown,
  schema: z.ZodType<T>
): ParsedIntegrationBody<T> {
  if (!isPlainRecord(body)) return invalidBody()

  const { sourceExternalReference, ...resourcePayload } = body
  const parsedReference = SourceExternalReferenceSchema.safeParse(
    sourceExternalReference
  )
  const parsedPayload = schema.safeParse(resourcePayload)
  if (!parsedReference.success || !parsedPayload.success) return invalidBody()

  return {
    data: {
      params: parsedPayload.data,
      sourceExternalReference: parsedReference.data ?? null,
    },
    response: null,
  }
}

/** Requires a stable per-app create key and hashes the canonical payload. */
export function requireCreateAttribution(
  request: Request,
  access: AttributionAccess,
  payload: unknown,
  sourceExternalReference: string | null
): AttributionResult {
  if (access.platformAdmin) {
    if (sourceExternalReference !== null)
      return {
        data: null,
        response: apiError(
          'Source external references require a product app credential.',
          { status: 422 }
        ),
      }

    return { data: null, response: null }
  }

  if (!access.sourceAppId)
    return {
      data: null,
      response: apiError('The product app identity could not be resolved.', {
        status: 401,
      }),
    }

  const idempotencyKey = request.headers.get('idempotency-key')?.trim()
  if (!idempotencyKey || idempotencyKey.length > 255)
    return {
      data: null,
      response: apiError(
        'Provide an Idempotency-Key header between 1 and 255 characters.',
        { status: 400 }
      ),
    }

  return {
    data: {
      sourceAppId: access.sourceAppId,
      sourceExternalReference,
      sourceIdempotencyKey: idempotencyKey,
      sourcePayloadHash: createHash('sha256')
        .update(canonicalize({ payload, sourceExternalReference }))
        .digest('hex'),
    },
    response: null,
  }
}

function invalidBody(): ParsedIntegrationBody<never> {
  return {
    data: null,
    response: apiError('Enter valid integration resource details.', {
      status: 422,
    }),
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

/** Produces an unambiguous, key-sorted representation including bigint values. */
function canonicalize(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `string:${JSON.stringify(value)}`
  if (typeof value === 'boolean')
    return value ? 'boolean:true' : 'boolean:false'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite number')
    return `number:${Object.is(value, -0) ? '-0' : value}`
  }
  if (typeof value === 'bigint') return `bigint:${value}`
  if (Array.isArray(value))
    return `array:[${value.map(canonicalize).join(',')}]`
  if (isPlainRecord(value))
    return `object:{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalize(value[key] as unknown)}`
      )
      .join(',')}}`

  throw new TypeError('Unsupported integration payload value')
}
