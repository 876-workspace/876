import 'server-only'

import { getError, toAppError } from '@876/core'
import { CustomerRequestsPanel } from '@876/crm-ui/customer-requests-panel'

import { getManageContext } from '@/lib/auth/manage-context'
import { crm } from '@/lib/services/crm'
import { resolveCustomer } from '../../../_lib/customer-data'

export async function CustomerRequestsData({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { orgSlug, id } = await params
  const [context, customer] = await Promise.all([
    getManageContext(orgSlug),
    resolveCustomer(orgSlug, id),
  ])
  const baseHref = `/${orgSlug}/customers/${encodeURIComponent(id)}/requests`

  if (!context || !customer)
    return (
      <CustomerRequestsPanel
        state={{
          status: 'error',
          message: toAppError(getError('auth/forbidden')).message,
        }}
        requestBaseHref={baseHref}
      />
    )

  const result = await crm.requests.listForBillingCustomer(
    context.orgId,
    customer.profile.billingCustomerId
  )
  if (result.error)
    return (
      <CustomerRequestsPanel
        state={{
          status: 'error',
          message: toAppError(getError(result.error.code)).message,
        }}
        requestBaseHref={baseHref}
      />
    )

  return (
    <CustomerRequestsPanel
      state={
        result.data.data.length
          ? { status: 'ready', requests: result.data.data }
          : { status: 'empty' }
      }
      requestBaseHref={baseHref}
      newRequestHref={`${baseHref}/new`}
      layout="inline"
    />
  )
}
