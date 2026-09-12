import { CustomerRequestsPanel } from '@876/crm-ui/customer-requests-panel'
import { AppError } from '@876/ui/app-error'

import { crm } from '@/lib/services/crm'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

export async function CustomerRequestsTab({
  customerId,
}: {
  customerId: string
}) {
  const context = await requireCrmContext()
  const result = await crm.requests.list(context.orgId, { customerId })
  if (result.error)
    return (
      <AppError
        title="Request history is temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )
  const requests = result.data.data
  return (
    <CustomerRequestsPanel
      state={
        requests.length ? { status: 'ready', requests } : { status: 'empty' }
      }
      requestHref={(requestId) => `/requests/${requestId}`}
      newRequestHref="/requests/new"
    />
  )
}
