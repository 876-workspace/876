'use client'

import {
  RequestEventsSection as SharedRequestEventsSection,
  type RequestEventCreateInput,
} from '@876/crm-ui/request-events'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import type { CrmOperatorClient } from '@876/crm/operator'
import { client } from '@/lib/client'

type RequestEventList = NonNullable<
  Awaited<ReturnType<CrmOperatorClient['requestEvents']['list']>>['data']
>

type Props = {
  organizationId: string
  requestId: string
  events: RequestEventList['data']
}

/** Console operator-tier transport adapter for the shared CRM schedule UI. */
export function RequestEventsSection({
  organizationId,
  requestId,
  events,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <SharedRequestEventsSection
      events={events}
      onCreate={(input: RequestEventCreateInput) =>
        client.requestEvents.create(organizationId, requestId, input)
      }
      onDelete={(eventId) =>
        client.requestEvents.delete(organizationId, requestId, eventId)
      }
      onChanged={() => startTransition(() => router.refresh())}
    />
  )
}
