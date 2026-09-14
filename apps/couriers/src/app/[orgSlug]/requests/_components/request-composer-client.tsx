'use client'

import { useRouter } from 'next/navigation'

import {
  RequestComposer,
  type RequestComposerCustomerOption,
  type RequestComposerInput,
} from '@876/crm-ui/request-composer'

import { client } from '@/lib/client'

export function RequestComposerClient({
  orgSlug,
  baseHref,
  customerOptions,
  customerId,
}: {
  orgSlug: string
  baseHref: string
  customerOptions?: readonly RequestComposerCustomerOption[]
  customerId?: string
}) {
  const router = useRouter()

  async function submit(input: RequestComposerInput) {
    const selectedCustomerId = customerId ?? input.customerId
    if (!selectedCustomerId)
      return {
        error: {
          code: 'crm/customer-not-found',
          message: 'Customer not found.',
        },
      }

    const result = await client.requests.create(orgSlug, selectedCustomerId, {
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
      customerOptions={customerOptions}
      onSubmit={submit}
      onCancel={() => router.push(baseHref)}
    />
  )
}
