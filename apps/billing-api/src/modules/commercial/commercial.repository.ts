import { prisma } from '@/db/client'
import type { PaymentTermRule } from '@/db'

export function listPaymentTermRows(tenantId: string) {
  return prisma.paymentTerm.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { dueDays: 'asc' }, { id: 'asc' }],
    take: 100,
  })
}

export function createPaymentTermRow(data: {
  id: string
  tenantId: string
  name: string
  rule: PaymentTermRule
  dueDays: number
  isDefault: boolean
  createdAt: number
  updatedAt: number
}) {
  return prisma.$transaction(async (transaction) => {
    if (data.isDefault) {
      await transaction.paymentTerm.updateMany({
        where: { tenantId: data.tenantId, isDefault: true },
        data: { isDefault: false, updatedAt: data.updatedAt },
      })
    }

    return transaction.paymentTerm.create({
      data: { ...data, isSystem: false, isActive: true },
    })
  })
}

export function listSalespersonRows(tenantId: string) {
  return prisma.salesperson.findMany({
    where: { tenantId },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    take: 100,
  })
}

export function createSalespersonRow(data: {
  id: string
  tenantId: string
  name: string
  email: string | null
  externalReference: string | null
  createdAt: number
  updatedAt: number
}) {
  return prisma.salesperson.create({ data: { ...data, isActive: true } })
}
