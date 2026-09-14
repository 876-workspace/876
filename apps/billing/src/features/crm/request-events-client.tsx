'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import type { RequestEvent } from '@876/crm'
import {
  RequestEventsSection,
  type RequestEventCreateInput,
} from '@876/crm-ui/request-events'

import { request } from '@/lib/client/request'

export function RequestEventsClient({
  requestId,
  events,
}: {
  requestId: string
  events: readonly RequestEvent[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const base = `/api/requests/${encodeURIComponent(requestId)}/events`

  return (
    <RequestEventsSection
      events={events}
      onCreate={(input: RequestEventCreateInput) =>
        request<RequestEvent>(base, {
          method: 'POST',
          body: JSON.stringify(input),
        })
      }
      onDelete={(eventId) =>
        request<{ id: string }>(`${base}/${encodeURIComponent(eventId)}`, {
          method: 'DELETE',
        })
      }
      onChanged={() => startTransition(() => router.refresh())}
    />
  )
}
