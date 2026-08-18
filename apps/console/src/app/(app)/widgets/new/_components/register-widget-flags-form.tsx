'use client'

import { useEffect, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { CheckCircle } from '@876/ui/icons'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Skeleton } from '@876/ui/skeleton'

import { useAsyncValue } from '@/hooks/use-async-value'
import { client } from '@/lib/client'

export type PendingFlag = {
  slug: string
  /** Master key this flag hangs off, or null when it is itself a master. */
  parentSlug: string | null
  appId: string | null
  name: string
  description: string
  /** Set when the flag is already registered — its existing feature ID. */
  existingId: string | null
}

export type PendingWidget = {
  id: string
  name: string
  flags: PendingFlag[]
}

export function RegisterWidgetFlagsForm({
  widgets,
}: {
  widgets: PendingWidget[] | Promise<PendingWidget[]>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [widgetId, setWidgetId] = useState('')
  const widgetsState = useAsyncValue(widgets)
  const resolvedWidgets = widgetsState.value ?? []

  useEffect(() => {
    if (!widgetId && resolvedWidgets.length > 0)
      setWidgetId(resolvedWidgets[0]!.id)
  }, [resolvedWidgets, widgetId])

  const selected = resolvedWidgets.find((widget) => widget.id === widgetId)
  const missing = selected?.flags.filter((flag) => !flag.existingId) ?? []

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || missing.length === 0) return

    setError(null)
    startTransition(async () => {
      // Masters first: a child flag carries `parent_feature_id`, so the parent
      // has to exist before the child can reference it.
      const ordered = [
        ...missing.filter((flag) => flag.parentSlug === null),
        ...missing.filter((flag) => flag.parentSlug !== null),
      ]
      // Seeded with the masters that already exist, so a child whose parent was
      // registered in an earlier pass still gets linked to it.
      const idBySlug = new Map<string, string>(
        selected.flags
          .filter((flag) => flag.existingId !== null)
          .map((flag) => [flag.slug, flag.existingId as string])
      )

      for (const flag of ordered) {
        const { data, error: resultError } = await client.features.create({
          name: flag.name,
          slug: flag.slug,
          description: flag.description,
          scope: 'global',
          tags: ['widget'],
          default_enabled: false,
          default_value: false,
          consumer_default_enabled: false,
          server_side_only: true,
          app_id: flag.appId,
          parent_feature_id: flag.parentSlug
            ? (idBySlug.get(flag.parentSlug) ?? null)
            : null,
        })
        if (resultError || !data) {
          setError(
            `Failed to create ${flag.slug}: ${
              resultError?.message ?? 'unknown error'
            }`
          )
          router.refresh()
          return
        }
        idBySlug.set(flag.slug, data.id)
      }

      router.push('/widgets')
      router.refresh()
    })
  }

  return (
    <form className="876-card max-w-2xl" onSubmit={handleSubmit}>
      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="widget-id">Widget</Label>
          <NativeSelect
            id="widget-id"
            value={widgetId}
            onChange={(event) => setWidgetId(event.target.value)}
            className="w-full"
            disabled={widgetsState.pending || Boolean(widgetsState.error)}
          >
            {widgetsState.pending ? (
              <NativeSelectOption value="">Loading widgets…</NativeSelectOption>
            ) : widgetsState.error ? (
              <NativeSelectOption value="">Widgets unavailable</NativeSelectOption>
            ) : resolvedWidgets.length === 0 ? (
              <NativeSelectOption value="">No widgets declared</NativeSelectOption>
            ) : (
              resolvedWidgets.map((widget) => (
                <NativeSelectOption key={widget.id} value={widget.id}>
                  {widget.name}
                </NativeSelectOption>
              ))
            )}
          </NativeSelect>
          <p className="text-muted-foreground text-xs">
            Widgets are declared in the <code>@876/widgets</code> catalog. This
            registers the flags that gate one.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Flags</Label>
          {widgetsState.pending ? (
            <div className="border-876-surface-border divide-876-surface-border divide-y rounded-md border">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 px-3 py-2.5"
                >
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : selected ? (
            <ul className="border-876-surface-border divide-876-surface-border divide-y rounded-md border">
              {selected.flags.map((flag) => (
                <li
                  key={flag.slug}
                  className="flex items-center justify-between gap-4 px-3 py-2.5"
                >
                  <span className="truncate font-mono text-xs">{flag.slug}</span>
                  {flag.existingId ? (
                    <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 text-xs">
                      <CheckCircle className="size-3.5" />
                      Registered
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Will be created
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-876-surface-border text-muted-foreground rounded-md border px-3 py-3 text-xs">
              {widgetsState.error
                ? widgetsState.error.message
                : 'No widget flags to register.'}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            New flags are created disabled. Turn them on from the widgets list.
          </p>
        </div>

        {error && <p className="text-destructive text-[0.8125rem]">{error}</p>}
      </div>

      <div className="border-876-surface-border flex justify-end gap-2 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/widgets')}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={
            isPending ||
            widgetsState.pending ||
            Boolean(widgetsState.error) ||
            missing.length === 0
          }
        >
          {isPending
            ? 'Registering...'
            : widgetsState.pending
              ? 'Loading…'
              : missing.length === 0
                ? 'All registered'
                : `Register ${missing.length} flag${missing.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </form>
  )
}
