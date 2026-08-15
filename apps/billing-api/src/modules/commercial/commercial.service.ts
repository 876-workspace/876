import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createPaymentTermRow,
  createSalespersonRow,
  listPaymentTermRows,
  listSalespersonRows,
} from './commercial.repository'
import type {
  PaymentTermCreateBody,
  SalespersonCreateBody,
} from './commercial.schemas'
import {
  serializePaymentTerm,
  serializeSalesperson,
} from './commercial.serializers'

export async function listPaymentTerms(tenantId: string) {
  const rows = await listPaymentTermRows(tenantId)
  return {
    object: 'list' as const,
    data: rows.map(serializePaymentTerm),
    has_more: false,
    total_count: rows.length,
    url: '/api/v1/payment-terms',
  }
}

export async function createPaymentTerm(
  tenantId: string,
  body: PaymentTermCreateBody
) {
  const now = nowUnixSeconds()
  const row = await createPaymentTermRow({
    id: generateId('pterm'),
    tenantId,
    name: body.name,
    rule: body.rule,
    dueDays: body.dueDays,
    isDefault: body.isDefault,
    createdAt: now,
    updatedAt: now,
  })

  return serializePaymentTerm(row)
}

export async function listSalespeople(tenantId: string) {
  const rows = await listSalespersonRows(tenantId)
  return {
    object: 'list' as const,
    data: rows.map(serializeSalesperson),
    has_more: false,
    total_count: rows.length,
    url: '/api/v1/salespeople',
  }
}

export async function createSalesperson(
  tenantId: string,
  body: SalespersonCreateBody
) {
  const now = nowUnixSeconds()
  const row = await createSalespersonRow({
    id: generateId('sales'),
    tenantId,
    name: body.name,
    email: body.email ?? null,
    externalReference: body.externalReference ?? null,
    createdAt: now,
    updatedAt: now,
  })

  return serializeSalesperson(row)
}
