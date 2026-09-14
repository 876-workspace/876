'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import type { RequestTask } from '@876/crm'
import {
  RequestTasksPanel,
  type RequestTaskCreateInput,
} from '@876/crm-ui/request-tasks'

import { request } from '@/lib/client/request'

export function RequestTasksClient({
  requestId,
  tasks,
}: {
  requestId: string
  tasks: readonly RequestTask[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <RequestTasksPanel
      tasks={tasks}
      onCreate={(input: RequestTaskCreateInput) =>
        request<RequestTask>(
          `/api/requests/${encodeURIComponent(requestId)}/tasks`,
          {
            method: 'POST',
            body: JSON.stringify(input),
          }
        )
      }
      onChanged={() => startTransition(() => router.refresh())}
    />
  )
}
