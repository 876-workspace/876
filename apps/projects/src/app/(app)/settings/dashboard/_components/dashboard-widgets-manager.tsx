'use client'

import type { CustomModule, DashboardWidget } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { dashboardWidgetsClient } from '@/lib/client'

const KINDS = ['record-count', 'status-breakdown', 'recent-records'] as const

export function DashboardWidgetsManager({
  modules,
  initial,
  userId,
}: {
  modules: readonly CustomModule[]
  initial: readonly DashboardWidget[]
  userId: string
}) {
  const router = useRouter()
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '')
  const [kind, setKind] = useState<(typeof KINDS)[number]>('record-count')
  const [title, setTitle] = useState('')
  const [shared, setShared] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const ordered = [...initial].sort((a, b) => a.position - b.position)

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !moduleId) return

    setPending(true)
    setError(null)
    const result = await dashboardWidgetsClient.create({
      kind,
      moduleId,
      ...(shared ? { userId: null } : { userId }),
      ...(title.trim() === '' ? {} : { config: { title: title.trim() } }),
      position: ordered.length,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/dashboard-widget-save-failed',
          message: 'The widget could not be created.',
        }
      )
      return
    }
    setTitle('')
    router.refresh()
  }

  async function onRemove(widgetId: string) {
    setError(null)
    const result = await dashboardWidgetsClient.remove(widgetId)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function onMove(widget: DashboardWidget, offset: -1 | 1) {
    const index = ordered.findIndex((entry) => entry.id === widget.id)
    const target = ordered[index + offset]
    if (!target) return
    setError(null)
    const first = await dashboardWidgetsClient.update(widget.id, { position: target.position })
    if (first.error || !first.data) {
      setError(first.error ?? { code: 'projects/widget-reorder-failed', message: 'Widgets could not be reordered.' })
      return
    }
    const second = await dashboardWidgetsClient.update(target.id, { position: widget.position })
    if (second.error) {
      setError(second.error)
      return
    }
    router.refresh()
  }

  function moduleName(id: string): string {
    return modules.find((module) => module.id === id)?.pluralName ?? id
  }

  return (
    <div className="space-y-6">
      {error ? <AppError title="Widgets not saved" error={error} variant="banner" /> : null}
      {ordered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No widgets yet. Add the first one below.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {ordered.map((widget, index) => (
            <li key={widget.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {moduleName(widget.moduleId)} · {widget.kind}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {widget.userId === null ? 'Shared' : 'Personal'} · position {widget.position}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onMove(widget, -1)}
                  aria-label={`Move widget ${widget.id} up`}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === ordered.length - 1}
                  onClick={() => onMove(widget, 1)}
                  aria-label={`Move widget ${widget.id} down`}
                >
                  Down
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(widget.id)}
                  aria-label={`Remove widget ${widget.id}`}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onCreate} className="max-w-2xl space-y-5">
        <h3 className="text-sm font-semibold">New widget</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Module" htmlFor="widget-module">
            <NativeSelect
              id="widget-module"
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
            >
              {modules.map((module) => (
                <NativeSelectOption key={module.id} value={module.id}>
                  {module.pluralName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="Kind" htmlFor="widget-kind">
            <NativeSelect
              id="widget-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as typeof kind)}
            >
              {KINDS.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {option}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormRow>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Title" htmlFor="widget-title" hint="Optional. Defaults to the module name.">
            <Input
              id="widget-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Risks by status"
            />
          </FormRow>
          <FormRow label="Shared" htmlFor="widget-shared" hint="Shared widgets show for everyone.">
            <Checkbox
              id="widget-shared"
              checked={shared}
              onCheckedChange={(checked) => setShared(checked === true)}
            />
          </FormRow>
        </div>
        <Button type="submit" disabled={pending || modules.length === 0}>
          {pending ? 'Adding…' : 'Add widget'}
        </Button>
      </form>
    </div>
  )
}
