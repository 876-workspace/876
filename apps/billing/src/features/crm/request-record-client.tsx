'use client'

import type { CrmRequest, UpdateRequestInput } from '@876/crm'
import { RequestRecord } from '@876/crm-ui/request-record'
import type { ReactNode } from 'react'

import { request } from '@/lib/client/request'

export function RequestRecordClient({
  value,
  baseHref,
  closeHref,
  customerHref,
  children,
}: {
  value: CrmRequest
  baseHref: string
  closeHref?: string
  customerHref?: string
  children?: ReactNode
}) {
  return (
    <RequestRecord
      request={value}
      baseHref={baseHref}
      closeHref={closeHref}
      customerHref={customerHref}
      onUpdate={async (input: UpdateRequestInput) =>
        request<CrmRequest>(`/api/requests/${encodeURIComponent(value.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
      }
    >
      {children}
    </RequestRecord>
  )
}
