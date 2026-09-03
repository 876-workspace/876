'use client'

import { ISSUE_PRIORITIES, ISSUE_STATUSES } from '@876/projects/contracts'
import { AppError } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { client } from '@/lib/client'

type ErrorValue = { code: string; message: string }

type ProjectOption = { id: string; name: string; key: string }

type Props = {
  organizationId: string
  base: string
  projects: ProjectOption[]
  /** The signed-in Console operator, recorded as the issue's creator. */
  currentUserId: string
}

function label(value: string) {
  const formatted = value.replace(/-/g, ' ')
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function IssueCreateForm({
  organizationId,
  base,
  projects,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)

  if (projects.length === 0) {
    return (
      <div className="876-card max-w-2xl overflow-hidden">
        <div className="bg-muted/20 border-b px-5 py-3.5">
          <h2 className="876-section-title">Issue details</h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-muted-foreground text-sm">
            Create a project before opening an issue.
          </p>
          <div>
            <Link
              href={`${base}/projects/new`}
              className={buttonVariants({ variant: 'info' })}
            >
              New project
            </Link>
          </div>
        </div>
      </div>
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const projectId = String(form.get('projectId') ?? '').trim()
    const title = String(form.get('title') ?? '').trim()
    if (!projectId || !title) return

    const description = String(form.get('description') ?? '').trim()
    // Narrowed against the catalog rather than asserted; see the project form.
    const status = ISSUE_STATUSES.find((s) => s === form.get('status'))
    const priority = ISSUE_PRIORITIES.find((p) => p === form.get('priority'))

    setSubmitting(true)
    setError(null)
    const result = await client.issues.create(organizationId, {
      projectId,
      title,
      description: description || null,
      creatorUserId: currentUserId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    router.push(`${base}/issues/${result.data.identifier}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit}>
      <div className="876-card max-w-2xl overflow-hidden">
        <div className="bg-muted/20 border-b px-5 py-3.5">
          <h2 className="876-section-title">Issue details</h2>
        </div>

        <div className="space-y-5 p-5">
          {error ? (
            <AppError
              title="Issue could not be created"
              error={error}
              variant="form"
              showCode
            />
          ) : null}

          <FormRow label="Project" htmlFor="projectId" required>
            <NativeSelect
              id="projectId"
              name="projectId"
              defaultValue=""
              required
              className="w-full"
            >
              <NativeSelectOption value="">
                Select a project…
              </NativeSelectOption>
              {projects.map((project) => (
                <NativeSelectOption key={project.id} value={project.id}>
                  {`${project.name} (${project.key})`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormRow>

          <FormRow label="Title" htmlFor="title" required>
            <Input
              id="title"
              name="title"
              required
              placeholder="What needs to be done?"
              autoFocus
            />
          </FormRow>

          <FormRow label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              className="min-h-40 resize-y"
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
                {ISSUE_STATUSES.map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {label(item)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormRow>

            <FormRow label="Priority" htmlFor="priority">
              <NativeSelect
                id="priority"
                name="priority"
                defaultValue=""
                className="w-full"
              >
                <NativeSelectOption value="">
                  Select a priority…
                </NativeSelectOption>
                {ISSUE_PRIORITIES.map((item) => (
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
            onClick={() => router.push(`${base}/issues`)}
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
