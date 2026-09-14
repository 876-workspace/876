'use client'

import { useState } from 'react'

import type { CrmRequest, UpdateRequestInput } from '@876/crm'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

import { RequestDetailCard } from './request-detail-card'

export function RequestRecord({
  request,
  baseHref,
  closeHref,
  customerHref,
  layout = 'card',
  closeLabel,
  onUpdate,
  children,
}: {
  request: CrmRequest
  baseHref: string
  closeHref?: string
  customerHref?: string
  layout?: 'card' | 'inline'
  closeLabel?: string
  onUpdate: (input: UpdateRequestInput) => Promise<{
    data: CrmRequest | null
    error: AppErrorValue | null
  }>
  children?: React.ReactNode
}) {
  const [current, setCurrent] = useState(request)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function update(key: string, input: UpdateRequestInput) {
    setSaving(key)
    setError(null)
    const result = await onUpdate(input)
    setSaving(null)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.data) setCurrent(result.data)
  }

  return (
    <RequestDetailCard
      request={current}
      baseHref={baseHref}
      closeHref={closeHref}
      closeLabel={closeLabel}
      customerHref={customerHref}
      layout={layout}
    >
      {error ? (
        <AppError
          title="Request could not be updated"
          error={error}
          variant="inline"
        />
      ) : null}
      <section className="space-y-3" aria-label="Edit request">
        <label className="grid gap-1 text-sm">
          Status
          <select
            value={current.status}
            disabled={saving === 'status'}
            onChange={(event) =>
              void update('status', {
                status: event.target.value as CrmRequest['status'],
              })
            }
          >
            {[
              'OPEN',
              'IN_PROGRESS',
              'WAITING',
              'RESOLVED',
              'CLOSED',
              'CANCELLED',
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Priority ID
          <Input
            defaultValue={current.priorityId}
            onBlur={(event) => {
              const priorityId = event.target.value.trim()
              if (priorityId && priorityId !== current.priorityId)
                void update('priority', { priorityId })
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Assignee ID
          <Input
            defaultValue={current.assigneeId ?? ''}
            onBlur={(event) => {
              const assigneeId = event.target.value.trim() || null
              if (assigneeId !== current.assigneeId)
                void update('assignee', { assigneeId })
            }}
          />
        </label>
        {saving ? (
          <Button type="button" disabled>
            Saving…
          </Button>
        ) : null}
      </section>
      {children}
    </RequestDetailCard>
  )
}
