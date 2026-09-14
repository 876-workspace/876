'use client'

import type { ReactNode } from 'react'

import type { CrmRequest, UpdateRequestInput } from '@876/crm'
import { RequestRecord } from '@876/crm-ui/request-record'

import { client } from '@/lib/client'

export function RequestRecordClient({
  orgSlug,
  request,
  baseHref,
  closeHref,
  customerHref,
  layout = 'card',
  closeLabel,
  children,
}: {
  orgSlug: string
  request: CrmRequest
  baseHref: string
  closeHref: string
  customerHref?: string
  layout?: 'card' | 'inline'
  closeLabel?: string
  children?: ReactNode
}) {
  return (
    <RequestRecord
      request={request}
      baseHref={baseHref}
      closeHref={closeHref}
      closeLabel={closeLabel}
      customerHref={customerHref}
      layout={layout}
      onUpdate={(input: UpdateRequestInput) =>
        client.requests.update(orgSlug, request.id, input)
      }
    >
      {children}
    </RequestRecord>
  )
}
