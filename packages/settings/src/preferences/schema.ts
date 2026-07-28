import { z } from 'zod'

import type { ModuleDefinition, PreferenceDefinition } from '../types'

const DECIMAL_PATTERN = /^-?\d{1,16}(\.\d{1,8})?$/

export function preferenceSchema(def: PreferenceDefinition): z.ZodType {
  switch (def.type) {
    case 'boolean':
      return z.boolean()
    case 'string':
      return def.maxLength === undefined
        ? z.string()
        : z.string().max(def.maxLength)
    case 'enum':
      return z
        .string()
        .refine(
          (value) => def.options.some((option) => option.value === value),
          `Invalid option for ${def.key}`
        )
    case 'integer': {
      let schema = z.number().int()
      if (def.min !== undefined) schema = schema.min(def.min)
      if (def.max !== undefined) schema = schema.max(def.max)

      return schema
    }
    case 'decimal':
      return z
        .string()
        .regex(DECIMAL_PATTERN, `Invalid decimal for ${def.key}`)
        .refine(
          (value) =>
            def.min === undefined || compareDecimalStrings(value, def.min) >= 0,
          `Value for ${def.key} is below the minimum`
        )
        .refine(
          (value) =>
            def.max === undefined || compareDecimalStrings(value, def.max) <= 0,
          `Value for ${def.key} is above the maximum`
        )
    case 'reference':
      return z.string()
  }
}

export function moduleUpdateSchema(module: ModuleDefinition): z.ZodType {
  const shape: Record<string, z.ZodType> = {}

  for (const preference of module.preferences) {
    shape[preference.key] = preference.readOnly
      ? z.never({ error: `${preference.key} is read-only` }).optional()
      : preferenceSchema(preference).optional()
  }

  return z.strictObject(shape)
}

export function compareDecimalStrings(left: string, right: string): number {
  const normalizedLeft = normalizeDecimal(left)
  const normalizedRight = normalizeDecimal(right)

  if (normalizedLeft.negative !== normalizedRight.negative)
    return normalizedLeft.negative ? -1 : 1

  const magnitude =
    normalizedLeft.integer.length !== normalizedRight.integer.length
      ? Math.sign(
          normalizedLeft.integer.length - normalizedRight.integer.length
        )
      : `${normalizedLeft.integer}${normalizedLeft.fraction}`.localeCompare(
          `${normalizedRight.integer}${normalizedRight.fraction}`
        )

  return normalizedLeft.negative ? -magnitude : magnitude
}

function normalizeDecimal(value: string): {
  negative: boolean
  integer: string
  fraction: string
} {
  const negative = value.startsWith('-')
  const [rawInteger, rawFraction = ''] = value.replace(/^-/, '').split('.')
  const integer = rawInteger.replace(/^0+(?=\d)/, '')
  const fraction = rawFraction.padEnd(8, '0')
  const isZero = /^0+$/.test(integer) && /^0*$/.test(fraction)

  return { negative: negative && !isZero, integer, fraction }
}
