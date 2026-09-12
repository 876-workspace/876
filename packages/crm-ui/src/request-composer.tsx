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

export type RequestComposerInput = {
  subject: string
  description: string
  priority: string
  category: string | null
}

export type RequestComposerSubmitResult = {
  error: AppErrorValue | null
}

export function RequestComposer({
  state,
  relatedResource,
  onSubmit,
  onCancel,
}: {
  state: RequestComposerState
  relatedResource?: {
    type: RelatedResourceType
    id: string
    snapshot: RelatedResourceSnapshot
  } | null
  onSubmit: (
    input: RequestComposerInput
  ) => void | RequestComposerSubmitResult | Promise<RequestComposerSubmitResult | void>
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
      const result = await onSubmit({
        subject: String(form.get('subject') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        priority: String(form.get('priority') ?? '').trim(),
        category: String(form.get('category') ?? '').trim() || null,
      })
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
