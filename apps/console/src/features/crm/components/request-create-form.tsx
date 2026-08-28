'use client'

import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { InformationCircleIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { client } from '@/lib/client'

import type { RequestCustomerOption } from '../request-customer-option'
import type { RequestPriority } from '../types'
import { CustomerSelectionCard } from './request-customer-picker'

type ErrorValue = { code: string; message: string }

type Props = {
  organizationId: string
  requestsHref: string
  currentUserId: string
  customers: RequestCustomerOption[]
  priorities: RequestPriority[]
}

export function RequestCreateForm({
  organizationId,
  requestsHref,
  currentUserId,
  customers,
  priorities,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState<ErrorValue | null>(null)
  const activePriorities = priorities.filter((priority) => priority.isActive)
  const defaultPriority = activePriorities.find(
    (priority) => priority.isDefault
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const subject = String(form.get('subject') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    const priorityId = String(form.get('priorityId') ?? '').trim()
    const source = String(form.get('source') ?? 'CRM') as
      'CRM' | 'EMAIL' | 'PHONE' | 'CHAT' | 'WEB' | 'API' | 'OTHER'
    if (!customerId || !subject) return

    setSubmitting(true)
    setError(null)
    const result = await client.requests.create(organizationId, {
      customerId,
      subject,
      description: description || null,
      ...(priorityId ? { priorityId } : {}),
      source,
      createdBy: currentUserId,
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    router.push(`${requestsHref}/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="876-card min-w-0 overflow-hidden">
          <div className="bg-muted/20 border-b px-5 py-3.5">
            <h2 className="876-section-title">Request details</h2>
          </div>

          <div className="space-y-5 p-5">
            {error ? (
              <AppError
                title="Request could not be created"
                error={error}
                variant="form"
              />
            ) : null}
            <FormRow label="Subject" htmlFor="subject" required>
              <Input
                id="subject"
                name="subject"
                required
                placeholder="What does the customer need help with?"
                autoFocus
              />
            </FormRow>

            <FormRow label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the request and include any details the team needs…"
                className="min-h-48 resize-y"
              />
            </FormRow>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormRow label="Priority" htmlFor="priorityId">
                <NativeSelect id="priorityId" name="priorityId" defaultValue="">
                  <NativeSelectOption value="">
                    {defaultPriority
                      ? `Default (${defaultPriority.name})`
                      : 'Default'}
                  </NativeSelectOption>
                  {activePriorities.map((priority) => (
                    <NativeSelectOption key={priority.id} value={priority.id}>
                      {priority.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormRow>

              <FormRow label="Source" htmlFor="source">
                <NativeSelect id="source" name="source" defaultValue="CRM">
                  <NativeSelectOption value="CRM">CRM</NativeSelectOption>
                  <NativeSelectOption value="EMAIL">Email</NativeSelectOption>
                  <NativeSelectOption value="PHONE">Phone</NativeSelectOption>
                  <NativeSelectOption value="CHAT">Chat</NativeSelectOption>
                  <NativeSelectOption value="WEB">Web</NativeSelectOption>
                  <NativeSelectOption value="API">API</NativeSelectOption>
                  <NativeSelectOption value="OTHER">Other</NativeSelectOption>
                </NativeSelect>
              </FormRow>
            </div>
          </div>

          <div className="bg-muted/10 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <InformationCircleIcon className="size-3.5" />
              The request opens in the shared support record after saving.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(requestsHref)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="info"
                disabled={submitting || !customerId}
              >
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6">
          <CustomerSelectionCard
            customers={customers}
            selectedId={customerId}
            onSelect={setCustomerId}
          />
        </aside>
      </div>
    </form>
  )
}
