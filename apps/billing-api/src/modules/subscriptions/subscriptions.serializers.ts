import { Prisma } from '@/db'

function json(value: unknown): unknown {
  if (typeof value === 'bigint' || value instanceof Prisma.Decimal)
    return value.toString()
  if (Array.isArray(value)) return value.map(json)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, json(item)])
    )

  return value
}

export function serializeSubscription(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value

  return {
    object: 'subscription',
    ...(json(value) as Record<string, unknown>),
  }
}

export function serializeResource(
  value: unknown,
  discriminator: string
): unknown {
  if (!value || typeof value !== 'object') return value

  return { object: discriminator, ...(json(value) as Record<string, unknown>) }
}

export function subscriptionList(rows: unknown[], url: string) {
  return {
    object: 'list' as const,
    data: rows.map(serializeSubscription),
    has_more: false,
    total_count: rows.length,
    url,
  }
}

export function resourceList(
  rows: unknown[],
  discriminator: string,
  url: string
) {
  return {
    object: 'list' as const,
    data: rows.map((row) => serializeResource(row, discriminator)),
    has_more: false,
    total_count: rows.length,
    url,
  }
}
