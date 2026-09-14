'use client'

import type { ReactNode } from 'react'

import type { CrmRequest, UpdateRequestInput } from '@876/crm'
import { RequestRecord } from '@876/crm-ui/request-record'

import { client } from '@/lib/client'

export function CustomerRequestRecordClient({
  orgSlug,
  request,
  baseHref,
  closeHref,
  children,
}: {
  orgSlug: string
  request: CrmRequest
  baseHref: string
  closeHref: string
  children?: ReactNode
}) {
  return (
    <RequestRecord
      request={request}
      baseHref={baseHref}
      closeHref={closeHref}
      closeLabel="Back to requests"
      layout="inline"
      onUpdate={(input: UpdateRequestInput) =>
        client.requests.update(orgSlug, request.id, input)
      }
    >
      {children}
    </RequestRecord>
  )
}
