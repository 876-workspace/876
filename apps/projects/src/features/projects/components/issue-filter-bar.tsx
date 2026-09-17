import type { Label, Project, WorkflowState } from '@876/projects/contracts'
import { buttonVariants, Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { IssueGroupBy, IssueSearchParams } from '@/types/issues'

type MemberOption = { userId: string; label: string }

type Props = {
  action: '/issues' | '/board'
  values: IssueSearchParams
  groupBy: IssueGroupBy
  projects: readonly Project[]
  workflowStates: readonly WorkflowState[]
  labels: readonly Label[]
  members: readonly MemberOption[]
  allowUngrouped?: boolean
}

const GROUP_OPTIONS: Array<{ value: IssueGroupBy; label: string }> = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'Workflow state' },
  { value: 'project', label: 'Project' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'type', label: 'Work item type' },
  { value: 'milestone', label: 'Phase' },
]

export function IssueFilterBar({
  action,
  values,
  groupBy,
  projects,
  workflowStates,
  labels,
  members,
  allowUngrouped = true,
}: Props) {
  const groupOptions = allowUngrouped
    ? GROUP_OPTIONS
    : GROUP_OPTIONS.filter((option) => option.value !== 'none')

  return (
    <form
      action={action}
      method="get"
      className="876-card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"
    >
      <label className="space-y-1 xl:col-span-2">
        <span className="text-muted-foreground text-xs font-medium">
          Search
        </span>
        <Input
          name="q"
          defaultValue={values.q ?? ''}
          placeholder="Title or identifier"
        />
      </label>

      <FilterSelect label="Project" name="project" value={values.project}>
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect label="Status" name="status" value={values.status}>
        <option value="">All states</option>
        {workflowStates.map((state) => (
          <option key={state.id} value={state.key}>
            {state.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect label="Priority" name="priority" value={values.priority}>
        <option value="">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="none">None</option>
      </FilterSelect>

      <FilterSelect label="Assignee" name="assignee" value={values.assignee}>
        <option value="">All assignees</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect label="Label" name="label" value={values.label}>
        <option value="">All labels</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect label="Order" name="order" value={values.order}>
        <option value="">Default order</option>
        <option value="updated">Recently updated</option>
        <option value="created">Recently created</option>
        <option value="priority">Priority</option>
        <option value="manual">Manual</option>
      </FilterSelect>

      <FilterSelect label="Group" name="group" value={groupBy}>
        {groupOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FilterSelect>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
        <Button type="submit" variant="outline" size="sm">
          Apply filters
        </Button>
        <Link
          href={action}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          Clear
        </Link>
      </div>
    </form>
  )
}

function FilterSelect({
  label,
  name,
  value,
  children,
}: {
  label: string
  name: string
  value?: string
  children: ReactNode
}) {
  return (
    <label className="space-y-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <NativeSelect name={name} defaultValue={value ?? ''} className="w-full">
        {children}
      </NativeSelect>
    </label>
  )
}
