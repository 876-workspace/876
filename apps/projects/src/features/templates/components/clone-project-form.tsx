'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { templatesClient } from '@/lib/client/templates'
import { parseDateInput } from '@/lib/date-input'

const START_ERROR: AppErrorValue = {
  code: 'projects/project-clone-invalid-start',
  message: 'Enter a valid date for the new project to start from.',
}

export function CloneProjectForm({
  project,
}: {
  project: { id: string; name: string; key: string }
}) {
  const router = useRouter()
  const [name, setName] = useState(`${project.name} copy`)
  const [key, setKey] = useState(project.key)
  const [start, setStart] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !key.trim() || pending) return

    const startDate = start === '' ? undefined : parseDateInput(start)
    if (startDate === null) {
      setError(START_ERROR)
      return
    }

    setPending(true)
    setError(null)
    const result = await templatesClient.cloneProject(project.id, {
      name: name.trim(),
      key: key.trim(),
      ...(startDate === undefined ? {} : { startDate }),
    })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/project-clone-failed',
          message: 'The project could not be cloned.',
        }
      )
      return
    }

    router.push(`/projects/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label="Clone project"
    >
      {error ? (
        <AppError title="The project could not be cloned" error={error} />
      ) : null}

      <div className="876-card space-y-2 p-4 text-sm">
        <p className="font-medium">Clone contents</p>
        <p className="text-muted-foreground">
          Phases, task lists, work items, dependencies, and budget defaults are
          copied. Members, time entries, and comments are not copied. Leave the
          start date empty to keep the original schedule.
        </p>
      </div>

      <FormRow label="Name" htmlFor="project-clone-name" required>
        <Input
          id="project-clone-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </FormRow>

      <FormRow label="Key" htmlFor="project-clone-key" required>
        <Input
          id="project-clone-key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
      </FormRow>

      <FormRow
        label="Start date"
        htmlFor="project-clone-start"
        hint="Empty keeps the original dates."
      >
        <Input
          id="project-clone-start"
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className="w-full sm:w-56"
        />
      </FormRow>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={!name.trim() || !key.trim() || pending}
        >
          {pending ? 'Cloning…' : 'Clone'}
        </Button>
      </div>
    </form>
  )
}
