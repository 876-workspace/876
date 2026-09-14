'use client'

import { useState, type FormEvent } from 'react'

import type { RelatedResourceSnapshot, RelatedResourceType } from '@876/crm'
import type { AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

export type RequestComposerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

export type RequestComposerCustomerOption = {
  id: string
  name: string
  description?: string | null
}

export type RequestComposerInput = {
  subject: string
  description: string
  priority: string
  category: string | null
  customerId?: string
}

export type RequestComposerSubmitResult = {
  error: AppErrorValue | null
}

export function RequestComposer({
  state,
  relatedResource,
  customerOptions,
  onSubmit,
  onCancel,
}: {
  state: RequestComposerState
  relatedResource?: {
    type: RelatedResourceType
    id: string
    snapshot: RelatedResourceSnapshot
  } | null
  customerOptions?: readonly RequestComposerCustomerOption[]
  onSubmit: (
    input: RequestComposerInput
  ) =>
    | void
    | RequestComposerSubmitResult
    | Promise<RequestComposerSubmitResult | void>
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || state.status !== 'ready') return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setSubmissionError(null)
    try {
      const input: RequestComposerInput = {
        subject: String(form.get('subject') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        priority: String(form.get('priority') ?? '').trim(),
        category: String(form.get('category') ?? '').trim() || null,
      }
      if (customerOptions) {
        const customerId = String(form.get('customerId') ?? '').trim()
        if (!customerId) {
          setSubmissionError('Select a customer before creating the request.')
          return
        }
        input.customerId = customerId
      }

      const result = await onSubmit(input)
      if (result?.error) setSubmissionError(result.error.message)
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : 'Request could not be created.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (state.status === 'loading') return <p>Loading request form…</p>
  if (state.status === 'error') return <p role="alert">{state.message}</p>

  return (
    <form className="space-y-4" onSubmit={submit}>
      {submissionError ? <p role="alert">{submissionError}</p> : null}
      {relatedResource ? (
        <p className="bg-muted inline-flex rounded-full px-3 py-1 text-sm">
          About {relatedResource.type}{' '}
          {relatedResource.snapshot.number ?? relatedResource.id}
        </p>
      ) : null}
      {customerOptions ? (
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Customer</span>
          <select
            name="customerId"
            required
            defaultValue=""
            className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="" disabled>
              Select a customer
            </option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.description
                  ? `${customer.name} — ${customer.description}`
                  : customer.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Input name="subject" required placeholder="Subject" />
      <Textarea name="description" placeholder="Description" />
      <Input name="priority" required placeholder="Priority" />
      <Input name="category" placeholder="Category (optional)" />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create request'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
