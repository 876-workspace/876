'use client'

import type { Label, Project } from '@876/projects/contracts'
import { buttonVariants } from '@876/ui/button'
import { XMarkIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { Popover, PopoverContent, PopoverTrigger } from '@876/ui/popover'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@876/ui/sheet'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { IssueGroupBy, IssueSearchParams } from '@/types/issues'

type MemberOption = { userId: string; label: string }

type Props = {
  action: '/issues' | '/board'
  values: IssueSearchParams
  groupBy: IssueGroupBy
  projects: readonly Project[]
  labels: readonly Label[]
  members: readonly MemberOption[]
  allowUngrouped?: boolean
}

export const GROUP_OPTIONS: Array<{ value: IssueGroupBy; label: string }> = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'Workflow state' },
  { value: 'project', label: 'Project' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'type', label: 'Work item type' },
  { value: 'milestone', label: 'Phase' },
]

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
}

export const ORDER_LABELS: Record<string, string> = {
  updated: 'Recently updated',
  created: 'Recently created',
  priority: 'Priority',
  manual: 'Manual',
}

type FilterParam = 'project' | 'priority' | 'assignee' | 'label' | 'order' | 'group'

type Chip = { key: string; label: string; href: string }

export function IssueFilterBar({
  action,
  values,
  groupBy,
  projects,
  labels,
  members,
  allowUngrouped = true,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(values.q ?? '')

  const groupOptions = allowUngrouped
    ? GROUP_OPTIONS
    : GROUP_OPTIONS.filter((option) => option.value !== 'none')

  function navigate(params: URLSearchParams) {
    params.delete('after')
    params.delete('before')
    const query = params.toString()
    router.push(query ? `${action}?${query}` : action)
  }

  function hrefWithout(paramKey: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(paramKey)
    params.delete('after')
    params.delete('before')
    const query = params.toString()
    return query ? `${action}?${query}` : action
  }

  function handleSelectChange(paramKey: FilterParam, nextValue: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextValue === '') {
      params.delete(paramKey)
    } else {
      params.set(paramKey, nextValue)
    }
    navigate(params)
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    const next = search.trim()
    if (next) {
      params.set('q', next)
    } else {
      params.delete('q')
    }
    navigate(params)
  }

  const chips: Chip[] = []
  if (values.project) {
    const projectName =
      projects.find((project) => project.id === values.project)?.name ??
      values.project
    chips.push({
      key: 'project',
      label: `Project: ${projectName}`,
      href: hrefWithout('project'),
    })
  }
  if (values.priority) {
    chips.push({
      key: 'priority',
      label: `Priority: ${PRIORITY_LABELS[values.priority] ?? values.priority}`,
      href: hrefWithout('priority'),
    })
  }
  if (values.assignee) {
    const assigneeLabel =
      members.find((member) => member.userId === values.assignee)?.label ??
      values.assignee
    chips.push({
      key: 'assignee',
      label: `Assignee: ${assigneeLabel}`,
      href: hrefWithout('assignee'),
    })
  }
  if (values.label) {
    const labelName =
      labels.find((label) => label.id === values.label)?.name ?? values.label
    chips.push({
      key: 'label',
      label: `Label: ${labelName}`,
      href: hrefWithout('label'),
    })
  }
  if (values.order) {
    chips.push({
      key: 'order',
      label: `Order: ${ORDER_LABELS[values.order] ?? values.order}`,
      href: hrefWithout('order'),
    })
  }
  const groupParam = searchParams.get('group')
  if (groupParam) {
    const groupLabel =
      GROUP_OPTIONS.find((option) => option.value === groupParam)?.label ??
      groupParam
    chips.push({
      key: 'group',
      label: `Group: ${groupLabel}`,
      href: hrefWithout('group'),
    })
  }

  const triggerLabel = chips.length > 0 ? `Filters · ${chips.length}` : 'Filters'
  const current = {
    project: values.project ?? '',
    priority: values.priority ?? '',
    assignee: values.assignee ?? '',
    label: values.label ?? '',
    order: values.order ?? '',
    group: groupBy,
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <Popover>
            <PopoverTrigger
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {triggerLabel}
            </PopoverTrigger>
            <PopoverContent align="start">
              <FilterFields
                current={current}
                projects={projects}
                labels={labels}
                members={members}
                groupOptions={groupOptions}
                onSelect={handleSelectChange}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {triggerLabel}
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[85svh] overflow-y-auto"
            >
              <SheetTitle>Filters</SheetTitle>
              <FilterFields
                current={current}
                projects={projects}
                labels={labels}
                members={members}
                groupOptions={groupOptions}
                onSelect={handleSelectChange}
              />
            </SheetContent>
          </Sheet>
        </div>
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          className="min-w-0 flex-1"
        >
          <Input
            name="q"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title or identifier"
            aria-label="Search issues"
            className="w-full sm:max-w-xs"
          />
        </form>
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="bg-muted text-muted-foreground inline-flex h-6 items-center gap-1 rounded-full pr-1 pl-2.5 text-xs font-medium"
            >
              {chip.label}
              <Link
                href={chip.href}
                aria-label={`Remove ${chip.key} filter`}
                className="hover:text-foreground inline-flex size-4 items-center justify-center rounded-full"
              >
                <XMarkIcon className="size-3" aria-hidden="true" />
              </Link>
            </span>
          ))}
          <Link
            href={action}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function FilterFields({
  current,
  projects,
  labels,
  members,
  groupOptions,
  onSelect,
}: {
  current: Record<FilterParam, string>
  projects: readonly Project[]
  labels: readonly Label[]
  members: readonly MemberOption[]
  groupOptions: Array<{ value: IssueGroupBy; label: string }>
  onSelect: (paramKey: FilterParam, value: string) => void
}) {
  return (
    <div className="grid gap-3">
      <FilterSelect
        label="Project"
        value={current.project}
        onChange={(value) => onSelect('project', value)}
      >
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Priority"
        value={current.priority}
        onChange={(value) => onSelect('priority', value)}
      >
        <option value="">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="none">None</option>
      </FilterSelect>

      <FilterSelect
        label="Assignee"
        value={current.assignee}
        onChange={(value) => onSelect('assignee', value)}
      >
        <option value="">All assignees</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Label"
        value={current.label}
        onChange={(value) => onSelect('label', value)}
      >
        <option value="">All labels</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Order"
        value={current.order}
        onChange={(value) => onSelect('order', value)}
      >
        <option value="">Default order</option>
        <option value="updated">Recently updated</option>
        <option value="created">Recently created</option>
        <option value="priority">Priority</option>
        <option value="manual">Manual</option>
      </FilterSelect>

      <FilterSelect
        label="Group"
        value={current.group}
        onChange={(value) => onSelect('group', value)}
      >
        {groupOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FilterSelect>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="space-y-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <NativeSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      >
        {children}
      </NativeSelect>
    </label>
  )
}
