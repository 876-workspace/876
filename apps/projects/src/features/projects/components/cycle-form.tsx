'use client'

import type { Cycle, Project } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { cyclesClient } from '@/lib/client/cycles'

type Props =
  | {
      mode: 'create'
      projects: readonly Project[]
      cycle?: never
    }
  | {
      mode: 'edit'
      projects: readonly Project[]
      cycle: Cycle
    }

function dateInput(timestamp: number | null | undefined) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function dateTimestamp(value: string) {
  if (!value) return null
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000)
}

export function CycleForm(props: Props) {
  const router = useRouter()
  const editing = props.mode === 'edit'
  const cycle = editing ? props.cycle : null
  const [projectId, setProjectId] = useState(cycle?.projectId ?? '')
  const [name, setName] = useState(cycle?.name ?? '')
  const [description, setDescription] = useState(cycle?.description ?? '')
  const [goal, setGoal] = useState(cycle?.goal ?? '')
  const [startsAt, setStartsAt] = useState(dateInput(cycle?.startsAt))
  const [endsAt, setEndsAt] = useState(dateInput(cycle?.endsAt))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !startsAt || !endsAt || pending) return

    const startTimestamp = dateTimestamp(startsAt)
    const endTimestamp = dateTimestamp(endsAt)
    if (!startTimestamp || !endTimestamp || endTimestamp <= startTimestamp) {
      setError({
        code: 'projects/cycle-invalid-dates',
        message: 'The cycle end must be after its start.',
      })
      return
    }

    setPending(true)
    setError(null)

    const common = {
      name: name.trim(),
      description: description.trim() || null,
      goal: goal.trim() || null,
      startsAt: startTimestamp,
      endsAt: endTimestamp,
    }

    const result =
      props.mode === 'edit'
        ? await cyclesClient.update(props.cycle.id, {
            ...common,
            projectId: projectId || null,
          })
        : await cyclesClient.create({
            ...common,
            projectId: projectId || null,
          })

    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/cycle-save-failed',
          message: 'The cycle could not be saved.',
        }
      )
      return
    }

    router.push(`/cycles/${encodeURIComponent(result.data.id)}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label={editing ? 'Edit cycle' : 'New cycle'}
    >
      {error ? (
        <AppError title="The cycle could not be saved" error={error} />
      ) : null}

      <FormRow label="Project" htmlFor="cycle-project">
        <NativeSelect
          id="cycle-project"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="w-full"
        >
          <option value="">No project</option>
          {props.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>

      <FormRow label="Name" htmlFor="cycle-name" required>
        <Input
          id="cycle-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sprint 12"
          autoFocus
        />
      </FormRow>

      <FormRow label="Description" htmlFor="cycle-description">
        <Textarea
          id="cycle-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </FormRow>

      <FormRow label="Goal" htmlFor="cycle-goal">
        <Textarea
          id="cycle-goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={3}
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Starts" htmlFor="cycle-starts-at" required>
          <Input
            id="cycle-starts-at"
            type="date"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </FormRow>
        <FormRow label="Ends" htmlFor="cycle-ends-at" required>
          <Input
            id="cycle-ends-at"
            type="date"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </FormRow>
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
          disabled={!name.trim() || !startsAt || !endsAt || pending}
        >
          {pending ? 'Saving…' : editing ? 'Edit' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
