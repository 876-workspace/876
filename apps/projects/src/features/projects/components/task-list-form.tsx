'use client'

import type { Milestone, Project, TaskList } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'

import { taskListsClient } from '@/lib/client'

export type TaskListMemberOption = { userId: string; label: string }

type Props =
  | {
      mode: 'create'
      projects: readonly Project[]
      milestones: readonly Milestone[]
      members: readonly TaskListMemberOption[]
      defaultProjectId?: string
      taskList?: never
    }
  | {
      mode: 'edit'
      projects: readonly Project[]
      milestones: readonly Milestone[]
      members: readonly TaskListMemberOption[]
      defaultProjectId?: never
      taskList: TaskList
    }

function dateInput(timestamp: number | null | undefined) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function dateTimestamp(value: string) {
  if (!value) return null
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000)
}

export function TaskListForm(props: Props) {
  const router = useRouter()
  const editing = props.mode === 'edit'
  const taskList = editing ? props.taskList : null
  const [projectId, setProjectId] = useState(
    taskList?.projectId ?? props.defaultProjectId ?? props.projects[0]?.id ?? ''
  )
  const [milestoneId, setMilestoneId] = useState(taskList?.milestoneId ?? '')
  const [name, setName] = useState(taskList?.name ?? '')
  const [description, setDescription] = useState(taskList?.description ?? '')
  const [ownerUserId, setOwnerUserId] = useState(taskList?.ownerUserId ?? '')
  const [startDate, setStartDate] = useState(dateInput(taskList?.startDate))
  const [targetDate, setTargetDate] = useState(dateInput(taskList?.targetDate))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const availableMilestones = useMemo(
    () =>
      props.milestones.filter((milestone) => milestone.projectId === projectId),
    [props.milestones, projectId]
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || (!editing && !projectId) || pending) return

    setPending(true)
    setError(null)

    const common = {
      name: name.trim(),
      description: description.trim() || null,
      milestoneId: milestoneId || null,
      ownerUserId: ownerUserId || null,
      startDate: dateTimestamp(startDate),
      targetDate: dateTimestamp(targetDate),
    }

    const result = editing
      ? await taskListsClient.update(props.taskList.id, common)
      : await taskListsClient.create({ ...common, projectId })

    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/task-list-save-failed',
          message: 'The task list could not be saved.',
        }
      )
      return
    }

    router.push(`/projects/${encodeURIComponent(result.data.projectId)}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      {error ? (
        <AppError title="Task list not saved" error={error} variant="banner" />
      ) : null}

      {!editing ? (
        <FormRow label="Project" htmlFor="task-list-project" required>
          <NativeSelect
            id="task-list-project"
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value)
              setMilestoneId('')
            }}
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

      <FormRow label="Phase" htmlFor="task-list-phase">
        <NativeSelect
          id="task-list-phase"
          value={milestoneId}
          onChange={(event) => setMilestoneId(event.target.value)}
          className="w-full"
          disabled={!projectId}
        >
          <option value="">No phase</option>
          {availableMilestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>

      <FormRow label="Name" htmlFor="task-list-name" required>
        <Input
          id="task-list-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Backend groundwork"
          autoFocus
        />
      </FormRow>

      <FormRow label="Description" htmlFor="task-list-description">
        <Textarea
          id="task-list-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          placeholder="What this task list covers."
        />
      </FormRow>

      <FormRow label="Owner" htmlFor="task-list-owner">
        <NativeSelect
          id="task-list-owner"
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

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Start date" htmlFor="task-list-start-date">
          <Input
            id="task-list-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </FormRow>
        <FormRow label="Target date" htmlFor="task-list-target-date">
          <Input
            id="task-list-target-date"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
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
          disabled={!name.trim() || (!editing && !projectId) || pending}
        >
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
