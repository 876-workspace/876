'use client'

import type { WorkHostContext } from '@876/work'

export type WorkWidgetScope = 'my-work' | 'context'

function resourceName(resource: string): string {
  return resource
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function workContextScopeLabel(context: WorkHostContext): string {
  const base = `This ${resourceName(context.resource) || 'Resource'}`
  return context.label ? `${base} · ${context.label}` : base
}

export function WorkWidgetScopeSelector({
  context,
  scope,
  onChange,
}: {
  context: WorkHostContext
  scope: WorkWidgetScope
  onChange: (scope: WorkWidgetScope) => void
}) {
  return (
    <div className="border-876-surface-border border-b px-3 py-2">
      <label className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
        Scope
        <select
          value={scope}
          onChange={(event) => onChange(event.target.value as WorkWidgetScope)}
          className="border-876-surface-border bg-background text-foreground focus-visible:ring-ring mt-1.5 block w-full rounded-lg border px-2.5 py-2 text-xs font-medium normal-case tracking-normal focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Work scope"
        >
          <option value="my-work">My Work</option>
          <option value="context">{workContextScopeLabel(context)}</option>
        </select>
      </label>
    </div>
  )
}
