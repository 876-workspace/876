'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type {
  CrmRequest,
  RelatedResourceSnapshot,
  RelatedResourceType,
  RequestList,
} from '@876/crm'
import { RelatedRequestsPanel } from '@876/crm-ui/related-requests-panel'
import {
  RequestComposer,
  type RequestComposerInput,
} from '@876/crm-ui/request-composer'
import { Button } from '@876/ui/button'

import { request } from '@/lib/client/request'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; requests: readonly CrmRequest[] }

export function RelatedRequestsClient({
  customerId,
  resourceType,
  resourceId,
  snapshot,
  canCreate,
}: {
  customerId: string
  resourceType: RelatedResourceType
  resourceId: string
  snapshot: RelatedResourceSnapshot
  canCreate: boolean
}) {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({
      relatedResourceType: resourceType,
      relatedResourceId: resourceId,
    })
    void request<RequestList>(
      `/api/customers/${encodeURIComponent(customerId)}/requests?${query}`,
      { signal: controller.signal }
    ).then((result) => {
      if (controller.signal.aborted) return
      if (result.error)
        setState({ status: 'error', message: result.error.message })
      else setState({ status: 'ready', requests: result.data.data })
    })
    return () => controller.abort()
  }, [customerId, resourceId, resourceType])

  async function create(input: RequestComposerInput) {
    const result = await request<CrmRequest>(
      `/api/customers/${encodeURIComponent(customerId)}/requests`,
      {
        method: 'POST',
        body: JSON.stringify({
          subject: input.subject,
          description: input.description || null,
          priorityId: input.priority || undefined,
          categoryId: input.category,
          relatedResourceType: resourceType,
          relatedResourceId: resourceId,
          relatedResourceSnapshot: snapshot,
        }),
      }
    )
    if (result.error) return { error: result.error }
    router.push(
      `/customers/${encodeURIComponent(customerId)}/requests/${encodeURIComponent(result.data.id)}`
    )
    return { error: null }
  }

  const panelState =
    state.status === 'loading' || state.status === 'error'
      ? state
      : state.requests.length
        ? state
        : { status: 'empty' as const }

  return (
    <section className="mt-6 space-y-3">
      {canCreate ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setComposing(true)}>
            New request
          </Button>
        </div>
      ) : null}
      <RelatedRequestsPanel
        state={panelState}
        requestHref={(requestId) =>
          `/customers/${encodeURIComponent(customerId)}/requests/${encodeURIComponent(requestId)}`
        }
      />
      {canCreate && composing ? (
        <RequestComposer
          state={{ status: 'ready' }}
          relatedResource={{ type: resourceType, id: resourceId, snapshot }}
          onSubmit={create}
          onCancel={() => setComposing(false)}
        />
      ) : null}
    </section>
  )
}
