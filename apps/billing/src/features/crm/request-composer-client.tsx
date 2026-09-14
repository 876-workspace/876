'use client'

import { useRouter } from 'next/navigation'

import type { CrmRequest } from '@876/crm'
import {
  RequestComposer,
  type RequestComposerCustomerOption,
  type RequestComposerInput,
} from '@876/crm-ui/request-composer'

import { request } from '@/lib/client/request'

type Props = {
  baseHref: string
} & (
  | { customerId: string; customerOptions?: never }
  | {
      customerId?: never
      customerOptions: readonly RequestComposerCustomerOption[]
    }
)

export function RequestComposerClient(props: Props) {
  const router = useRouter()

  async function submit(input: RequestComposerInput) {
    const customerId = props.customerId ?? input.customerId
    if (!customerId)
      return {
        error: {
          code: 'crm/customer-required',
          message: 'Select a customer before creating the request.',
        },
      }

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
    router.push(`${props.baseHref}/${encodeURIComponent(result.data.id)}`)
    return { error: null }
  }

  return (
    <RequestComposer
      state={{ status: 'ready' }}
      customerOptions={props.customerOptions}
      onSubmit={submit}
      onCancel={() => router.push(props.baseHref)}
    />
  )
}
