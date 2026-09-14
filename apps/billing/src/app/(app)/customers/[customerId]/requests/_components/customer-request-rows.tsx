'use client'

import { useSearchParams } from 'next/navigation'

import type { CrmRequest } from '@876/crm'
import { CustomerRequestsPanel } from '@876/crm-ui/customer-requests-panel'

// A section layout receives no searchParams, so the status filter is read here
// and applied to the rows the layout already loaded (app-layout.md §5a).
export function CustomerRequestRows({
  baseHref,
  requests,
  errorMessage,
}: {
  baseHref: string
  requests: readonly CrmRequest[] | null
  errorMessage: string | null
}) {
  const status = useSearchParams().get('status')

  if (errorMessage || !requests)
    return (
      <CustomerRequestsPanel
        state={{
          status: 'error',
          message: errorMessage ?? 'Requests are unavailable.',
        }}
        requestBaseHref={baseHref}
      />
    )

  const visible =
    status && status !== 'all'
      ? requests.filter((request) => request.status === status)
      : requests

  return (
    <CustomerRequestsPanel
      state={
        visible.length
          ? { status: 'ready', requests: visible }
          : { status: 'empty' }
      }
      requestBaseHref={baseHref}
    />
  )
}
