import { toCrmCustomerRow } from '@876/crm-ui/customer-row'
import {
  RequestCustomersList,
  RequestCustomersListSkeleton,
} from '@876/crm-ui/request-customers-list'
import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Suspense } from 'react'

import { getInvoiceContext } from '@/lib/auth/context'
import { getCrm } from '@/lib/services/crm'

export const metadata = { title: 'Request customers' }

export default function RequestCustomersPage() {
  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <ResourceToolbar title="Customers" refresh />
      <Suspense fallback={<RequestCustomersListSkeleton />}>
        <RequestCustomersData />
      </Suspense>
    </Page>
  )
}

async function RequestCustomersData() {
  const context = await getInvoiceContext()
  if (!context) return null

  const result = await getCrm().customers.list(context.orgId)
  const missingWorkspace = result.error?.code === 'crm/tenant-not-found'
  const customers = result.data?.data.map(toCrmCustomerRow) ?? []

  return (
    <div className="space-y-3">
      {result.error && !missingWorkspace ? (
        <AppError
          title="Request customers could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <RequestCustomersList
        customers={customers}
        customerRequestsHrefBase="/customers"
      />
    </div>
  )
}
