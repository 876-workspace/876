import 'server-only'

import { getError, toAppError } from '@876/core'
import { toRequestListRows } from '@876/crm-ui/request-list-rows'

import { getManageContext } from '@/lib/auth/manage-context'
import { crm } from '@/lib/clients/crm'

import { RequestsList } from './requests-list'

export async function RequestsListData({ orgSlug }: { orgSlug: string }) {
  const context = await getManageContext(orgSlug)
  if (!context)
    return (
      <RequestsList
        orgSlug={orgSlug}
        requests={[]}
        error={toAppError(getError('auth/forbidden'))}
      />
    )

  const [requestsResult, customersResult] = await Promise.all([
    crm.requests.list(context.orgId),
    crm.customers.list(context.orgId),
  ])
  const error = requestsResult.error ?? customersResult.error
  const requests = requestsResult.data
    ? toRequestListRows({
        requests: requestsResult.data.data,
        customers: customersResult.data?.data ?? [],
      })
    : []

  return (
    <RequestsList
      orgSlug={orgSlug}
      requests={requests}
      error={error ? toAppError(getError(error.code)) : null}
    />
  )
}
