'use client'

import type { CrmRequest, UpdateRequestInput } from '@876/crm'
import type { ReactNode } from 'react'
import { RequestRecord } from '@876/crm-ui/request-record'

import { request } from '@/lib/client/request'

export function RequestRecordClient({
  value,
  baseHref,
  children,
}: {
  value: CrmRequest
  baseHref: string
  children?: ReactNode
}) {
  return (
    <RequestRecord
      request={value}
      baseHref={baseHref}
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
