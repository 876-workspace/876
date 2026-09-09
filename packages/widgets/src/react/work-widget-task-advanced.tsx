'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WorkAlert,
  WorkHostContext,
  WorkRecurrenceRule,
  WorkTask,
  WorkTaskAssignment,
} from '@876/work'
import { browserWork, type WorkBrowserClient } from '@876/work/browser'
import { WorkAlerts, type WorkAlertDraft } from '@876/work-ui/alerts'
import {
  WorkTaskAssignments,
  type WorkTaskAssignmentDraft,
} from '@876/work-ui/collaboration'
import { WorkRecurrenceEditor } from '@876/work-ui/recurrence'

import type { WorkWidgetCapabilities } from '../work-capabilities'
import { WorkWidgetErrorBanner } from './work-widget-feedback'

export function WorkWidgetTaskAdvanced({
  tasks,
  capabilities,
  context,
  client = browserWork,
}: {
  tasks: readonly WorkTask[]
  capabilities: WorkWidgetCapabilities
  context?: WorkHostContext
  client?: WorkBrowserClient
}) {
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [assignments, setAssignments] = useState<WorkTaskAssignment[]>([])
  const [rule, setRule] = useState<WorkRecurrenceRule | null>(null)
  const [alerts, setAlerts] = useState<WorkAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generationRef = useRef(0)

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null

  const load = useCallback(
    async (taskId: string) => {
      const generation = ++generationRef.current
      setLoading(true)
      setError(null)
      const [assignmentResult, recurrenceResult, alertResult] =
        await Promise.all([
          client.taskAssignments.list(taskId, context),
          client.tasks.recurrence.retrieve(taskId, context),
          client.alerts.listForTask(taskId, context),
        ])
      if (generation !== generationRef.current) return

      const failure =
        assignmentResult.error ?? recurrenceResult.error ?? alertResult.error
      if (failure) setError(failure.message)
      if (assignmentResult.data) setAssignments(assignmentResult.data.data)
      if (recurrenceResult.data !== undefined) setRule(recurrenceResult.data)
      if (alertResult.data) setAlerts(alertResult.data.data)
      setLoading(false)
    },
    [client, context]
  )

  useEffect(() => {
    if (!selectedTaskId) {
      generationRef.current += 1
      setAssignments([])
      setRule(null)
      setAlerts([])
      setError(null)
      return
    }
    void load(selectedTaskId)
  }, [load, selectedTaskId])

  async function mutate(
    operation: () => Promise<{ error: { message: string } | null }>
  ) {
    if (!selectedTask || pending) return false
    setPending(true)
    setError(null)
    const result = await operation()
    if (result.error) {
      setError(result.error.message)
      setPending(false)
      return false
    }
    await load(selectedTask.id)
    setPending(false)
    return true
  }

  return (
    <section
      className="border-876-surface-border mx-4 mb-4 space-y-3 rounded-xl border p-3"
      aria-label="Advanced task controls"
    >
      <div>
        <p className="text-sm font-semibold">Advanced task controls</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Recurrence, delegation, responses, and alerts stay owned by 876 Work.
        </p>
      </div>
      <select
        value={selectedTaskId}
        onChange={(event) => setSelectedTaskId(event.target.value)}
        aria-label="Task to manage"
        className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
      >
        <option value="">Select a task</option>
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title}
          </option>
        ))}
      </select>

      {error ? (
        <WorkWidgetErrorBanner
          message={error}
          onAction={() => {
            if (selectedTask) void load(selectedTask.id)
          }}
        />
      ) : null}

      {selectedTask ? (
        <div className="space-y-3" aria-busy={loading || pending}>
          <WorkRecurrenceEditor
            key={`task-recurrence:${selectedTask.id}:${rule?.id ?? 'none'}`}
            rule={rule}
            pending={loading || pending}
            onSave={(input) =>
              mutate(() =>
                client.tasks.recurrence.set(selectedTask.id, input, context)
              ).then(() => undefined)
            }
            onClear={
              rule
                ? () =>
                    mutate(() =>
                      client.tasks.recurrence.clear(selectedTask.id, context)
                    ).then(() => undefined)
                : undefined
            }
          />
          <WorkTaskAssignments
            assignments={assignments}
            pending={loading || pending}
            canManage={capabilities.canAssignTasks}
            canRespond={capabilities.canRespondTasks}
            onAssign={
              capabilities.canAssignTasks
                ? (input: WorkTaskAssignmentDraft) =>
                    mutate(() =>
                      client.taskAssignments.create(
                        selectedTask.id,
                        input,
                        context
                      )
                    )
                : undefined
            }
            onRemove={
              capabilities.canAssignTasks
                ? (assignment) =>
                    mutate(() =>
                      client.taskAssignments.delete(
                        selectedTask.id,
                        assignment.id,
                        context
                      )
                    ).then(() => undefined)
                : undefined
            }
            onRespond={
              capabilities.canRespondTasks
                ? (assignment, status) =>
                    mutate(() =>
                      client.taskAssignments.respond(
                        selectedTask.id,
                        assignment.id,
                        { status },
                        context
                      )
                    ).then(() => undefined)
                : undefined
            }
          />
          <WorkAlerts
            alerts={alerts}
            pending={loading || pending}
            canManage={capabilities.canEditTasks}
            onCreate={
              capabilities.canEditTasks
                ? (input: WorkAlertDraft) =>
                    mutate(() =>
                      client.alerts.createForTask(
                        selectedTask.id,
                        input,
                        context
                      )
                    )
                : undefined
            }
            onDismiss={
              capabilities.canEditTasks
                ? (alert) =>
                    mutate(() =>
                      client.alerts.updateForTask(
                        selectedTask.id,
                        alert.id,
                        { status: 'DISMISSED' },
                        context
                      )
                    ).then(() => undefined)
                : undefined
            }
            onRemove={
              capabilities.canEditTasks
                ? (alert) =>
                    mutate(() =>
                      client.alerts.deleteForTask(
                        selectedTask.id,
                        alert.id,
                        context
                      )
                    ).then(() => undefined)
                : undefined
            }
          />
        </div>
      ) : null}
    </section>
  )
}
