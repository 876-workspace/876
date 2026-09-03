'use client'

import { PROJECT_HEALTHS, PROJECT_STATUSES } from '@876/projects/contracts'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { client } from '@/lib/client'

type ErrorValue = { code: string; message: string }

type Props = {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/orgs/acme/workspace/projects`. */
  base: string
}

function label(value: string) {
  const formatted = value.replace(/-/g, ' ')
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function ProjectCreateForm({ organizationId, base }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const rawKey = String(form.get('key') ?? '').trim()
    if (!name || !rawKey) return

    const key = rawKey.toUpperCase()
    const description = String(form.get('description') ?? '').trim()
    // Narrowed against the catalog rather than asserted: the selects can be
    // left on their empty default, and `'' as ProjectStatus` is not true.
    const status = PROJECT_STATUSES.find((s) => s === form.get('status'))
    const health = PROJECT_HEALTHS.find((h) => h === form.get('health'))

    setSubmitting(true)
    setError(null)
    const result = await client.projects.create(organizationId, {
      name,
      key,
      description: description || null,
      ...(status ? { status } : {}),
      ...(health ? { health } : {}),
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    router.push(`${base}/projects/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit}>
      <div className="876-card max-w-2xl overflow-hidden">
        <div className="bg-muted/20 border-b px-5 py-3.5">
          <h2 className="876-section-title">Project details</h2>
        </div>

        <div className="space-y-5 p-5">
          {error ? (
            <AppError
              title="Project could not be created"
              error={error}
              variant="form"
              showCode
            />
          ) : null}

          <FormRow label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              placeholder="What is this project called?"
              autoFocus
            />
          </FormRow>

          <FormRow
            label="Key"
            htmlFor="key"
            required
            hint="Issues in this project are numbered with this prefix, e.g. CONSOLE-12."
          >
            <Input id="key" name="key" required placeholder="CONSOLE" />
          </FormRow>

          <FormRow label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              className="min-h-32 resize-y"
            />
          </FormRow>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormRow label="Status" htmlFor="status">
              <NativeSelect
                id="status"
                name="status"
                defaultValue=""
                className="w-full"
              >
                <NativeSelectOption value="">
                  Select a status…
                </NativeSelectOption>
                {PROJECT_STATUSES.map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {label(item)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormRow>

            <FormRow label="Health" htmlFor="health">
              <NativeSelect
                id="health"
                name="health"
                defaultValue=""
                className="w-full"
              >
                <NativeSelectOption value="">Select health…</NativeSelectOption>
                {PROJECT_HEALTHS.map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {label(item)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormRow>
          </div>
        </div>

        <div className="bg-muted/10 flex justify-end gap-2 border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`${base}/projects`)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="info" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  )
}
