'use client'

import { useRouter } from 'next/navigation'

import type { CrmRequest } from '@876/crm'
import {
  RequestComposer,
  type RequestComposerInput,
} from '@876/crm-ui/request-composer'

import { request } from '@/lib/client/request'

export function RequestComposerClient({
  customerId,
  baseHref,
}: {
  customerId: string
  baseHref: string
}) {
  const router = useRouter()
  async function submit(input: RequestComposerInput) {
    const result = await request<CrmRequest>(
      `/api/customers/${encodeURIComponent(customerId)}/requests`,
      {
        method: 'POST',
        body: JSON.stringify({
          subject: input.subject,
          description: input.description || null,
          priorityId: input.priority || undefined,
          categoryId: input.category,
        }),
      }
    )
    if (result.error) return { error: result.error }
    router.push(`${baseHref}/${encodeURIComponent(result.data.id)}`)
    return { error: null }
  }

  return (
    <RequestComposer
      state={{ status: 'ready' }}
      onSubmit={submit}
      onCancel={() => router.push(baseHref)}
    />
  )
}
