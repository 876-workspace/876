'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import type { RequestEvent } from '@876/crm'
import {
  RequestEventsSection,
  type RequestEventCreateInput,
} from '@876/crm-ui/request-events'

import { client } from '@/lib/client'

export function CustomerRequestEventsClient({
  orgSlug,
  requestId,
  events,
}: {
  orgSlug: string
  requestId: string
  events: readonly RequestEvent[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <RequestEventsSection
      events={events}
      onCreate={(input: RequestEventCreateInput) =>
        client.requests.events.create(orgSlug, requestId, input)
      }
      onDelete={(eventId) =>
        client.requests.events.delete(orgSlug, requestId, eventId)
      }
      onChanged={() => startTransition(() => router.refresh())}
    />
  )
}
