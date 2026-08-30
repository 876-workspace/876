import type { WorkTask } from '@876/work'
import type { ReactNode } from 'react'

import { cn } from '../lib/utils'

export type WorkTaskListProps = {
  tasks: readonly WorkTask[]
  empty?: ReactNode
  className?: string
  renderTask?: (task: WorkTask) => ReactNode
}

/**
 * Shared Work surface only. Data remains owned by the Work service; host apps
 * supply canonical Work resources and decide how mutations are performed.
 */
export function WorkTaskList({
  tasks,
  empty = 'No tasks',
  className,
  renderTask,
}: WorkTaskListProps) {
  if (tasks.length === 0)
    return (
      <div className={cn('text-muted-foreground text-sm', className)}>
        {empty}
      </div>
    )

  return (
    <ul className={cn('divide-y', className)}>
      {tasks.map((task) => (
        <li key={task.id} className="py-3 first:pt-0 last:pb-0">
          {renderTask ? (
            renderTask(task)
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{task.title}</div>
                {task.description ? (
                  <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                    {task.description}
                  </div>
                ) : null}
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">
                {task.status.replaceAll('_', ' ').toLowerCase()}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
