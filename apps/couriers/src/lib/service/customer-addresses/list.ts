import { prisma } from '@/lib/db'
import type {
  CustomerAddressListParams,
  CustomerAddressView,
} from '@/types/customer-address'

import { CUSTOMER_ADDRESS_WITH_ADDRESS, toCustomerAddressView } from './view'

export async function list(
  tenantId: string,
  params: CustomerAddressListParams
): Promise<CustomerAddressView[]> {
  const rows = await prisma.customerAddress.findMany({
    where: {
      tenantId,
      customerId: params.customerId,
      ...(params.type === undefined ? {} : { type: params.type }),
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    ...CUSTOMER_ADDRESS_WITH_ADDRESS,
  })

  return rows.map(toCustomerAddressView)
}
