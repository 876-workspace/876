import type {
  AnalyticsProperties,
  AnalyticsPropertyValue,
  AnalyticsRawProperties,
} from './types'
import { analyticsPropertyValueSchema } from './types'

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /authorization/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /card[_-]?(number|num|no)/i,
  /cvv/i,
  /cvc/i,
  /ssn/i,
  /otp/i,
  /pin/i,
  /verification[_-]?code/i,
  /auth[_-]?code/i,
] as const

export function sanitizeAnalyticsProperties(
  properties?: AnalyticsRawProperties | null
): AnalyticsProperties {
  const sanitized: AnalyticsProperties = {}

  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value === undefined) continue
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) continue

    if (isAnalyticsPropertyValue(value)) {
      sanitized[key] = value
      continue
    }

    if (value instanceof Error) {
      sanitized[`${key}_name`] = value.name
      sanitized[`${key}_message`] = value.message
      continue
    }

    sanitized[key] = String(value)
  }

  return sanitized
}

function isAnalyticsPropertyValue(
  value: unknown
): value is AnalyticsPropertyValue {
  return analyticsPropertyValueSchema.safeParse(value).success
}
