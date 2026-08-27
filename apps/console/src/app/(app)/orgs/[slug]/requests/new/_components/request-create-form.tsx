'use client'

import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'

type Props = {
  organizationId: string
  slug: string
  currentUserId: string
}

export function RequestCreateForm({
  organizationId,
  slug,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const customerId = String(form.get('customerId') ?? '').trim()
    const subject = String(form.get('subject') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    const priority = String(form.get('priority') ?? 'NORMAL') as
      'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    if (!customerId || !subject) return

    setSubmitting(true)
    const result = await client.requests.create(organizationId, {
      customerId,
      subject,
      description: description || null,
      priority,
      source: 'CRM',
      createdBy: currentUserId,
    })
    setSubmitting(false)

    if (result.error) return toast.error(result.error.message)
    router.push(`/orgs/${slug}/requests/${result.data.id}`)
    router.refresh()
  }

  return (
    <form className="876-card max-w-3xl space-y-5 p-5" onSubmit={submit}>
      <FormRow label="Customer ID" htmlFor="customerId" required>
        <Input id="customerId" name="customerId" required />
      </FormRow>
      <FormRow label="Subject" htmlFor="subject" required>
        <Input id="subject" name="subject" required />
      </FormRow>
      <FormRow label="Description" htmlFor="description">
        <Textarea id="description" name="description" />
      </FormRow>
      <FormRow label="Priority" htmlFor="priority">
        <NativeSelect id="priority" name="priority" defaultValue="NORMAL">
          <NativeSelectOption value="LOW">Low</NativeSelectOption>
          <NativeSelectOption value="NORMAL">Normal</NativeSelectOption>
          <NativeSelectOption value="HIGH">High</NativeSelectOption>
          <NativeSelectOption value="URGENT">Urgent</NativeSelectOption>
        </NativeSelect>
      </FormRow>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/orgs/${slug}/requests`)}
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={submitting}>
          Create
        </Button>
      </div>
    </form>
  )
}
