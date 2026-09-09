import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { describe, expect, it, vi } from 'vitest'
import type { WorkTask } from '@876/work'
import { WorkTasks } from '@876/work-ui/tasks'

const TASK: WorkTask = {
  object: 'task',
  id: 'task_1',
  uid: 'task-uid-1',
  organizationId: 'org_1',
  listId: 'list_1',
  parentTaskId: null,
  context: null,
  links: [],
  title: 'Review invoice',
  description: null,
  status: 'OPEN',
  importance: 'NORMAL',
  priorityId: null,
  assigneeId: 'user_1',
  assignments: [],
  startAt: null,
  startTimeZone: null,
  dueAt: null,
  dueTimeZone: null,
  estimatedDuration: null,
  percentComplete: 0,
  recurrenceRuleId: null,
  completedAt: null,
  completedBy: null,
  isOverdue: false,
  sortOrder: 0,
  createdBy: 'user_1',
  createdAt: 100,
  updatedAt: 100,
}

function ReadOnlyTasks() {
  return (
    <WorkTasks
      taskLists={[]}
      tasks={[TASK]}
      activeListId={null}
      onSelectList={() => undefined}
    />
  )
}

function EditableTasks() {
  return (
    <WorkTasks
      taskLists={[]}
      tasks={[TASK]}
      activeListId={null}
      onSelectList={() => undefined}
      onCreateTask={vi.fn().mockResolvedValue(true)}
      onUpdateTask={vi.fn().mockResolvedValue(true)}
      onCompleteTask={vi.fn()}
      onCancelTask={vi.fn()}
    />
  )
}

describe('Work task capability presentation', () => {
  it('hides mutation controls when the host supplies no mutation capabilities', async () => {
    render(<ReadOnlyTasks />)

    await expect.element(page.getByText('Review invoice')).toBeVisible()
    await expect.element(page.getByText('Add task')).not.toBeInTheDocument()
    await expect
      .element(page.getByRole('button', { name: 'Done' }))
      .not.toBeInTheDocument()
    await expect
      .element(page.getByRole('button', { name: 'Cancel task' }))
      .not.toBeInTheDocument()
  })

  it('shows non-destructive task controls when edit callbacks are supplied', async () => {
    render(<EditableTasks />)

    await expect.element(page.getByText('Add task')).toBeVisible()
    await expect
      .element(page.getByRole('button', { name: 'Done' }))
      .toBeVisible()
    await expect
      .element(page.getByRole('button', { name: 'Cancel task' }))
      .toBeVisible()
  })
})
