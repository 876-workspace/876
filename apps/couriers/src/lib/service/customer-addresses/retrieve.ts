import { prisma } from '@/lib/db'
import type { CustomerAddressView } from '@/types/customer-address'

import { CUSTOMER_ADDRESS_WITH_ADDRESS, toCustomerAddressView } from './view'

export async function retrieve(
  tenantId: string,
  id: string
): Promise<CustomerAddressView | null> {
  const row = await prisma.customerAddress.findFirst({
    where: { id, tenantId },
    ...CUSTOMER_ADDRESS_WITH_ADDRESS,
  })

  return row ? toCustomerAddressView(row) : null
}
