'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import type { RequestTask } from '@876/crm'
import {
  RequestTasksPanel,
  type RequestTaskCreateInput,
} from '@876/crm-ui/request-tasks'

import { client } from '@/lib/client'

export function CustomerRequestTasksClient({
  orgSlug,
  requestId,
  tasks,
}: {
  orgSlug: string
  requestId: string
  tasks: readonly RequestTask[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <RequestTasksPanel
      tasks={tasks}
      onCreate={(input: RequestTaskCreateInput) =>
        client.requests.tasks.create(orgSlug, requestId, input)
      }
      onChanged={() => startTransition(() => router.refresh())}
    />
  )
}
