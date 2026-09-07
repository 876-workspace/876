import type { TaxAuthority, TaxRate } from '@/db'

export function serializeTaxAuthority(row: TaxAuthority) {
  return {
    object: 'tax_authority' as const,
    id: row.id,
    name: row.name,
    description: row.description,
    countryCode: row.countryCode,
    subdivisionCode: row.subdivisionCode,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeTaxRate(
  row: TaxRate & { taxAuthority: TaxAuthority }
) {
  return {
    object: 'tax_rate' as const,
    id: row.id,
    name: row.name,
    description: row.description,
    taxType: row.taxType,
    rate: row.rate.toString(),
    inclusive: row.inclusive,
    startsAt: row.startsAt,
    isActive: row.isActive,
    isDefault: row.isDefault,
    taxAuthority: serializeTaxAuthority(row.taxAuthority),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
