import { prisma } from '@/db/client'
import type { VendorStatus } from '@/db'

export type VendorCreateRecord = {
  id: string
  tenantId: string
  externalReference: string | null
  name: string
  email: string | null
  phone: string | null
  defaultCurrency: string | null
  createdAt: number
  updatedAt: number
}

export type VendorUpdateRecord = {
  name?: string
  email?: string | null
  phone?: string | null
  defaultCurrency?: string | null
  status?: VendorStatus
  updatedAt: number
}

export function listVendorRows(tenantId: string, status?: VendorStatus) {
  return prisma.vendor.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 101,
  })
}

export function findVendorRow(tenantId: string, vendorId: string) {
  return prisma.vendor.findFirst({ where: { id: vendorId, tenantId } })
}

export function createVendorRow(data: VendorCreateRecord) {
  return prisma.vendor.create({ data })
}

export async function updateVendorRow(
  tenantId: string,
  vendorId: string,
  data: VendorUpdateRecord
) {
  const result = await prisma.vendor.updateMany({
    where: { id: vendorId, tenantId },
    data,
  })
  if (result.count === 0) return null

  return findVendorRow(tenantId, vendorId)
}

export async function deleteVendorRow(
  tenantId: string,
  vendorId: string
): Promise<boolean> {
  const result = await prisma.vendor.deleteMany({
    where: { id: vendorId, tenantId },
  })

  return result.count > 0
}
