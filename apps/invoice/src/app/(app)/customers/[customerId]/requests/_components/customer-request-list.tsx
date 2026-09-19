import 'server-only'

import { getError, toAppError } from '@876/core'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { getInvoiceContext } from '@/lib/auth/context'
import { getCrm } from '@/lib/clients/crm'

import { CustomerRequestRows } from './customer-request-rows'

export async function CustomerRequestList({
  customerId,
  baseHref,
}: {
  customerId: string
  baseHref: string
}) {
  const context = await getInvoiceContext()
  const result = context
    ? await getCrm().requests.listForBillingCustomer(context.orgId, customerId)
    : { data: null, error: toAppError(getError('auth/forbidden')) }

  return (
    <CustomerRequestRows
      baseHref={baseHref}
      requests={result.data?.data ?? null}
      errorMessage={result.error?.message ?? null}
    />
  )
}

export function CustomerRequestListSkeleton() {
  return <DataTableSkeleton columns={REQUEST_SKELETON_COLUMNS} rows={5} />
}

const REQUEST_SKELETON_COLUMNS = [
  { key: 'request', label: 'Request', width: '45%' },
  { key: 'status', label: 'Status', width: '25%' },
  { key: 'priority', label: 'Priority', width: '30%' },
]
