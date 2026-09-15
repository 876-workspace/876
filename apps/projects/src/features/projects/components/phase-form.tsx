'use client'

import type { MilestoneDetail, Project } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { phasesClient } from '@/lib/client'

export type PhaseMemberOption = { userId: string; label: string }

type Props =
  | {
      mode: 'create'
      projects: readonly Project[]
      members: readonly PhaseMemberOption[]
      phase?: never
    }
  | {
      mode: 'edit'
      projects: readonly Project[]
      members: readonly PhaseMemberOption[]
      phase: MilestoneDetail
    }

function keyFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function dateInput(timestamp: number | null | undefined) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function dateTimestamp(value: string) {
  if (!value) return null
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000)
}

export function PhaseForm(props: Props) {
  const router = useRouter()
  const editing = props.mode === 'edit'
  const phase = editing ? props.phase : null
  const [projectId, setProjectId] = useState(
    phase?.projectId ?? props.projects[0]?.id ?? ''
  )
  const [name, setName] = useState(phase?.name ?? '')
  const [key, setKey] = useState(phase?.key ?? '')
  const [description, setDescription] = useState(phase?.description ?? '')
  const [status, setStatus] = useState(phase?.status ?? 'open')
  const [ownerUserId, setOwnerUserId] = useState(phase?.ownerUserId ?? '')
  const [startDate, setStartDate] = useState(dateInput(phase?.startDate))
  const [targetDate, setTargetDate] = useState(dateInput(phase?.targetDate))
  const [position, setPosition] = useState(String(phase?.position ?? 0))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const resolvedKey = editing ? key : keyFromName(key || name)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !resolvedKey || (!editing && !projectId) || pending) return

    setPending(true)
    setError(null)

    const common = {
      name: name.trim(),
      description: description.trim() || null,
      status: status as 'open' | 'completed' | 'canceled',
      ownerUserId: ownerUserId || null,
      startDate: dateTimestamp(startDate),
      targetDate: dateTimestamp(targetDate),
      position: Number.parseInt(position || '0', 10) || 0,
    }

    const result = editing
      ? await phasesClient.update(phase.id, common)
      : await phasesClient.create({
          ...common,
          projectId,
          key: resolvedKey,
        })

    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/phase-save-failed',
          message: 'The phase could not be saved.',
        }
      )
      return
    }

    router.push(`/phases/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      {error ? <AppError title="Phase not saved" error={error} variant="banner" /> : null}

      {!editing ? (
        <FormRow label="Project" htmlFor="phase-project" required>
          <NativeSelect
            id="phase-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="w-full"
          >
            {props.projects.length === 0 ? (
              <option value="">No projects available</option>
            ) : null}
            {props.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
      ) : null}

      <FormRow label="Name" htmlFor="phase-name" required>
        <Input
          id="phase-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Launch readiness"
          autoFocus
        />
      </FormRow>

      <FormRow label="Key" htmlFor="phase-key" required>
        <Input
          id="phase-key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder={keyFromName(name) || 'launch-readiness'}
          disabled={editing}
        />
      </FormRow>

      <FormRow label="Description" htmlFor="phase-description">
        <Textarea
          id="phase-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          placeholder="What this phase is intended to accomplish."
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Status" htmlFor="phase-status">
          <NativeSelect
            id="phase-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full"
          >
            <option value="open">Open</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </NativeSelect>
        </FormRow>

        <FormRow label="Owner" htmlFor="phase-owner">
          <NativeSelect
            id="phase-owner"
            value={ownerUserId}
            onChange={(event) => setOwnerUserId(event.target.value)}
            className="w-full"
          >
            <option value="">Unassigned</option>
            {props.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.label}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Start date" htmlFor="phase-start-date">
          <Input
            id="phase-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </FormRow>
        <FormRow label="Target date" htmlFor="phase-target-date">
          <Input
            id="phase-target-date"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
        </FormRow>
      </div>

      <FormRow label="Order" htmlFor="phase-position">
        <Input
          id="phase-position"
          type="number"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
        />
      </FormRow>

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
          disabled={!name.trim() || !resolvedKey || (!editing && !projectId) || pending}
        >
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Create phase'}
        </Button>
      </div>
    </form>
  )
}
