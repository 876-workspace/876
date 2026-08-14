import type { PaymentTerm, Salesperson } from '@/db'

export function serializePaymentTerm(row: PaymentTerm) {
  return {
    object: 'payment_term' as const,
    id: row.id,
    name: row.name,
    rule: row.rule,
    dueDays: row.dueDays,
    isDefault: row.isDefault,
    isSystem: row.isSystem,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeSalesperson(row: Salesperson) {
  return {
    object: 'salesperson' as const,
    id: row.id,
    name: row.name,
    email: row.email,
    externalReference: row.externalReference,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
