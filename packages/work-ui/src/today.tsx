import type { WorkMyWork, WorkTask } from '@876/work'

import { cn } from '@876/core/utils'

import { WorkAgenda, type WorkAgendaItem } from './agenda'

export type WorkTodayProps = {
  work: WorkMyWork
  className?: string
  completingTaskId?: string | null
  onCompleteTask?: (task: WorkTask) => void | Promise<void>
  onOpenItem?: (item: WorkAgendaItem) => void
}

function dayLabel(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function timeLabel(item: WorkAgendaItem): string {
  if (item.allDay || item.at == null) return 'All day'
  return new Date(item.at * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function kindLabel(item: WorkAgendaItem): string {
  if (item.type === 'event') return 'Event'
  if (item.type === 'reminder') return 'Reminder'
  return 'Task'
}

function itemDetail(item: WorkAgendaItem): string | null {
  if (item.type === 'event') return item.value.location
  if (item.type === 'reminder') return item.value.note
  if (item.value.startAt != null && item.value.dueAt != null)
    return `Due ${new Date(item.value.dueAt * 1000).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })}`
  return item.value.description
}

function statusLabel(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase()
}

function AgendaItemDetails({ item }: { item: WorkAgendaItem }) {
  if (item.type === 'event')
    return (
      <div className="text-muted-foreground mt-3 space-y-1 border-t pt-3 text-xs">
        <p>Status: {statusLabel(item.value.status)}</p>
        {item.value.location ? <p>Location: {item.value.location}</p> : null}
        {item.value.description ? <p>{item.value.description}</p> : null}
      </div>
    )

  if (item.type === 'reminder')
    return (
      <div className="text-muted-foreground mt-3 space-y-1 border-t pt-3 text-xs">
        <p>Status: {statusLabel(item.value.status)}</p>
        {item.value.note ? <p>{item.value.note}</p> : null}
      </div>
    )

  return (
    <div className="text-muted-foreground mt-3 space-y-1 border-t pt-3 text-xs">
      <p>Status: {statusLabel(item.value.status)}</p>
      <p>Importance: {statusLabel(item.value.importance)}</p>
      {item.value.description ? <p>{item.value.description}</p> : null}
    </div>
  )
}

function CompleteTaskButton({
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

  const mutationPending = completingTaskId != null
  const completing = completingTaskId === task.id
  return (
    <button
      type="button"
      disabled={mutationPending}
      onClick={() => void onCompleteTask(task)}
      className="border-876-surface-border hover:bg-muted focus-visible:ring-ring shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
      aria-label={`Mark ${task.title} complete`}
    >
      {completing ? 'Saving…' : 'Done'}
    </button>
  )
}

function AgendaRow({
  item,
  completingTaskId,
  onCompleteTask,
  onOpenItem,
}: {
  item: WorkAgendaItem
  completingTaskId?: string | null
  onCompleteTask?: (task: WorkTask) => void | Promise<void>
  onOpenItem?: (item: WorkAgendaItem) => void
}) {
  const detail = itemDetail(item)
  const content = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {kindLabel(item)}
        </span>
        <time className="text-muted-foreground text-xs">{timeLabel(item)}</time>
      </div>
      <p className="mt-1 truncate text-sm font-medium">{item.value.title}</p>
      {detail ? (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
          {detail}
        </p>
      ) : null}
    </div>
  )

  return (
    <div className="border-876-surface-border flex items-start gap-3 rounded-xl border p-3">
      {onOpenItem ? (
        <button
          type="button"
          onClick={() => onOpenItem(item)}
          className="focus-visible:ring-ring min-w-0 flex-1 rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
        >
          {content}
        </button>
      ) : (
        <details className="min-w-0 flex-1">
          <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md focus-visible:ring-2 focus-visible:outline-none">
            {content}
          </summary>
          <AgendaItemDetails item={item} />
        </details>
      )}
      {item.type === 'task' ? (
        <CompleteTaskButton
          task={item.value}
          completingTaskId={completingTaskId}
          onCompleteTask={onCompleteTask}
        />
      ) : null}
    </div>
  )
}

export function WorkToday({
  work,
  className,
  completingTaskId,
  onCompleteTask,
  onOpenItem,
}: WorkTodayProps) {
  const activeTasks = work.tasks.filter(
    (task) => task.status !== 'DONE' && task.status !== 'CANCELLED'
  )

  return (
    <section className={cn('space-y-5 p-4', className)} aria-label="Today">
      <header>
        <p className="text-base font-semibold">Today</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {dayLabel(work.from)}
        </p>
      </header>

      {work.overdueTasks.length > 0 ? (
        <section aria-labelledby="work-overdue-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="work-overdue-heading" className="text-sm font-semibold">
              Overdue
            </h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {work.overdueTasks.length}
            </span>
          </div>
          <ul className="space-y-2">
            {work.overdueTasks.map((task) => (
              <li
                key={task.id}
                className="border-876-surface-border flex items-start gap-3 rounded-xl border p-3"
              >
                <details className="min-w-0 flex-1">
                  <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md focus-visible:ring-2 focus-visible:outline-none">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    {task.dueAt != null ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Due{' '}
                        {new Date(task.dueAt * 1000).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    ) : null}
                  </summary>
                  <div className="text-muted-foreground mt-3 space-y-1 border-t pt-3 text-xs">
                    <p>Status: {statusLabel(task.status)}</p>
                    <p>Importance: {statusLabel(task.importance)}</p>
                    {task.description ? <p>{task.description}</p> : null}
                  </div>
                </details>
                <CompleteTaskButton
                  task={task}
                  completingTaskId={completingTaskId}
                  onCompleteTask={onCompleteTask}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="work-schedule-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="work-schedule-heading" className="text-sm font-semibold">
            Schedule
          </h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {work.events.length + activeTasks.length + work.reminders.length}
          </span>
        </div>
        <WorkAgenda
          tasks={activeTasks}
          reminders={work.reminders}
          events={work.events}
          empty="Nothing scheduled for today."
          renderItem={(item) => (
            <AgendaRow
              item={item}
              completingTaskId={completingTaskId}
              onCompleteTask={onCompleteTask}
              onOpenItem={onOpenItem}
            />
          )}
        />
      </section>
    </section>
  )
}
