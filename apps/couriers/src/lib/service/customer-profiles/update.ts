import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { CustomerStatus, CustomerView } from '@/types/customer'
import type { ServiceResult } from '@/types/api'

import { errFrom, ok } from '../result'
import { toCustomerView } from './view'

export type CustomerProfileUpdateInput = {
  branchId?: string
  status?: CustomerStatus
  trn?: string
  isCommercial?: boolean
}

export async function update(
  tenantId: string,
  id: string,
  params: CustomerProfileUpdateInput
): ServiceResult<CustomerView> {
  const current = await prisma.courierCustomerProfile.findFirst({
    where: { id, tenantId, deletedAt: null },
  })
  if (!current) return errFrom('customer/not-found')
  const profile = await prisma.courierCustomerProfile.update({
    where: { id: current.id },
    data: { ...params, updatedAt: nowUnixSeconds() },
  })
  return ok(toCustomerView(profile))
}
