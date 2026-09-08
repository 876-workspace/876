import type { WorkTask, WorkTaskList as WorkTaskListResource } from '@876/work'

import { cn } from '@876/core/utils'

import { WorkTaskList } from './task-list'

export type WorkTasksProps = {
  taskLists: readonly WorkTaskListResource[]
  tasks: readonly WorkTask[]
  activeListId: string | null
  onSelectList: (listId: string | null) => void
  completingTaskId?: string | null
  onCompleteTask?: (task: WorkTask) => void | Promise<void>
  hasMore?: boolean
  className?: string
}

function label(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase()
}

function dueLabel(task: WorkTask): string | null {
  if (task.dueAt == null) return null
  return new Date(task.dueAt * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function CompleteButton({
  task,
  completingTaskId,
  onCompleteTask,
}: {
  task: WorkTask
  completingTaskId?: string | null
  onCompleteTask?: (task: WorkTask) => void | Promise<void>
}) {
  if (!onCompleteTask || task.status === 'DONE' || task.status === 'CANCELLED')
    return null

  const pending = completingTaskId != null
  const completing = completingTaskId === task.id
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onCompleteTask(task)}
      className="border-876-surface-border hover:bg-muted focus-visible:ring-ring shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
      aria-label={`Mark ${task.title} complete`}
    >
      {completing ? 'Saving…' : 'Done'}
    </button>
  )
}

function TaskRow({
  task,
  completingTaskId,
  onCompleteTask,
}: {
  task: WorkTask
  completingTaskId?: string | null
  onCompleteTask?: (task: WorkTask) => void | Promise<void>
}) {
  const due = dueLabel(task)
  return (
    <div className="border-876-surface-border flex items-start gap-3 rounded-xl border p-3">
      <details className="min-w-0 flex-1">
        <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md focus-visible:ring-2 focus-visible:outline-none">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {label(task.status)}
            </span>
            {task.importance !== 'NORMAL' ? (
              <span className="text-muted-foreground text-xs">
                {label(task.importance)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-medium">{task.title}</p>
          {due ? (
            <p className="text-muted-foreground mt-1 text-xs">Due {due}</p>
          ) : null}
        </summary>
        <div className="text-muted-foreground mt-3 space-y-1 border-t pt-3 text-xs">
          <p>Status: {label(task.status)}</p>
          <p>Importance: {label(task.importance)}</p>
          <p>Complete: {task.percentComplete}%</p>
          {task.description ? <p>{task.description}</p> : null}
          {task.recurrenceRuleId ? <p>Repeats</p> : null}
          {task.assignments.length > 0 ? (
            <p>
              {task.assignments.length}{' '}
              {task.assignments.length === 1 ? 'assignment' : 'assignments'}
            </p>
          ) : null}
        </div>
      </details>
      <CompleteButton
        task={task}
        completingTaskId={completingTaskId}
        onCompleteTask={onCompleteTask}
      />
    </div>
  )
}

export function WorkTasks({
  taskLists,
  tasks,
  activeListId,
  onSelectList,
  completingTaskId,
  onCompleteTask,
  hasMore = false,
  className,
}: WorkTasksProps) {
  const activeTasks = tasks.filter(
    (task) => task.status !== 'DONE' && task.status !== 'CANCELLED'
  )
  const completedTasks = tasks.filter((task) => task.status === 'DONE')

  return (
    <section className={cn('space-y-4 p-4', className)} aria-label="Tasks">
      <header>
        <p className="text-base font-semibold">Tasks</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Your assigned Work tasks.
        </p>
      </header>

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Task lists"
      >
        <button
          type="button"
          aria-pressed={activeListId === null}
          onClick={() => onSelectList(null)}
          className="border-876-surface-border aria-pressed:bg-muted focus-visible:ring-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          All
        </button>
        {taskLists.map((list) => (
          <button
            key={list.id}
            type="button"
            aria-pressed={activeListId === list.id}
            onClick={() => onSelectList(list.id)}
            className="border-876-surface-border aria-pressed:bg-muted focus-visible:ring-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            {list.name}
          </button>
        ))}
      </div>

      <WorkTaskList
        tasks={activeTasks}
        empty="No active tasks in this list."
        renderTask={(task) => (
          <TaskRow
            task={task}
            completingTaskId={completingTaskId}
            onCompleteTask={onCompleteTask}
          />
        )}
      />

      {hasMore ? (
        <p className="text-muted-foreground text-xs">
          More tasks are available. Pagination will be added before broad rollout.
        </p>
      ) : null}

      {completedTasks.length > 0 ? (
        <details className="border-876-surface-border rounded-xl border p-3">
          <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
            Completed ({completedTasks.length})
          </summary>
          <WorkTaskList
            tasks={completedTasks}
            className="mt-3"
            renderTask={(task) => <TaskRow task={task} />}
          />
        </details>
      ) : null}
    </section>
  )
}