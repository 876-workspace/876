'use client'

import {
  RequestEventsSection as SharedRequestEventsSection,
  type RequestEventCreateInput,
} from '@876/crm-ui/request-events'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { client } from '@/lib/client'
import type { CrmRequestEvent } from '@/types/crm'

/** CRM session-tier adapter for the shared request schedule surface. */
export function RequestEventsSection({
  requestId,
  events,
}: {
  requestId: string
  events: CrmRequestEvent[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <SharedRequestEventsSection
      events={events}
      onCreate={(input: RequestEventCreateInput) =>
        client.requestEvents.create(requestId, input)
      }
      onDelete={(eventId) => client.requestEvents.delete(requestId, eventId)}
      onChanged={() => startTransition(() => router.refresh())}
    />
  )
}
