'use client'

import { useRouter } from 'next/navigation'

import {
  RequestComposer,
  type RequestComposerInput,
} from '@876/crm-ui/request-composer'

import { client } from '@/lib/client'

export function CustomerRequestComposerClient({
  orgSlug,
  customerId,
  baseHref,
}: {
  orgSlug: string
  customerId: string
  baseHref: string
}) {
  const router = useRouter()

  async function submit(input: RequestComposerInput) {
    const result = await client.requests.create(orgSlug, customerId, {
      subject: input.subject,
      description: input.description || null,
      priorityId: input.priority || undefined,
      categoryId: input.category,
    })
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
