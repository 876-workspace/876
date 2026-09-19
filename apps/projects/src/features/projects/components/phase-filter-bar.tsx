'use client'

import type { ChangeEvent } from 'react'
import type { Project } from '@876/projects/contracts'
import { NativeSelect } from '@876/ui/native-select'
import Link from 'next/link'

function submitOnChange(event: ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit()
}

export function PhaseFilterBar({
  projects,
  project,
  status,
}: {
  projects: readonly Project[]
  project: string
  status: string
}) {
  const filtered = Boolean(project || (status && status !== 'all'))

  return (
    <form action="/phases" className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground block text-xs font-medium">
          Project
        </span>
        <NativeSelect
          name="project"
          defaultValue={project}
          onChange={submitOnChange}
          className="min-w-44"
        >
          <option value="">All projects</option>
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground block text-xs font-medium">
          Status
        </span>
        <NativeSelect
          name="status"
          defaultValue={status}
          onChange={submitOnChange}
          className="min-w-36"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </NativeSelect>
      </label>
      {filtered ? (
        <Link
          href="/phases"
          className="text-muted-foreground text-sm hover:underline"
        >
          Clear
        </Link>
      ) : null}
    </form>
  )
}
