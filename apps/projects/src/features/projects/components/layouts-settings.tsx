'use client'

import type { Layout } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { layoutsClient } from '@/lib/client'

const ENTITY_ORDER = ['project', 'phase', 'work-item'] as const

function entityTitle(entity: string) {
  if (entity === 'work-item') return 'Work items'
  return `${entity[0]?.toUpperCase()}${entity.slice(1)}s`
}

export function LayoutsSettings({
  layouts,
  typeNames,
}: {
  layouts: readonly Layout[]
  typeNames: Record<string, string>
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function makeDefault(id: string) {
    setPendingId(id)
    setError(null)
    const result = await layoutsClient.makeDefault(id)
    setPendingId(null)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  async function remove(id: string) {
    setPendingId(id)
    setError(null)
    const result = await layoutsClient.delete(id)
    setPendingId(null)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  const grouped = new Map<string, Layout[]>()
  for (const layout of layouts) {
    const key = `${layout.entity}::${layout.workItemTypeId ?? ''}`
    const list = grouped.get(key) ?? []
    list.push(layout)
    grouped.set(key, list)
  }
  const groupKeys = [...grouped.keys()].sort((a, b) => {
    const [entityA] = a.split('::')
    const [entityB] = b.split('::')
    return (
      ENTITY_ORDER.indexOf(entityA as (typeof ENTITY_ORDER)[number]) -
      ENTITY_ORDER.indexOf(entityB as (typeof ENTITY_ORDER)[number])
    )
  })

  return (
    <div className="space-y-6">
      {error ? (
        <AppError title="Layouts not saved" error={error} variant="banner" />
      ) : null}

      <div className="flex justify-end">
        <Link href="/settings/layouts/new" className={buttonVariants({ variant: 'info', size: 'sm' })}>
          New layout
        </Link>
      </div>

      {groupKeys.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No layouts yet. Create one to control which fields forms show.
        </p>
      ) : null}

      {groupKeys.map((groupKey) => {
        const [entity, typeId] = groupKey.split('::')
        const items = grouped.get(groupKey) ?? []
        return (
          <section key={groupKey} aria-label={entityTitle(entity ?? '')}>
            <h2 className="mb-2 text-sm font-semibold">
              {entityTitle(entity ?? '')}
              {typeId ? ` · ${typeNames[typeId] ?? typeId}` : null}
            </h2>
            <div className="876-card divide-y overflow-hidden">
              {items.map((layout) => (
                <div
                  key={layout.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {layout.name}
                      {layout.isDefault ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {layout.sections.length} section
                      {layout.sections.length === 1 ? '' : 's'} · v
                      {layout.version}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {layout.id && !layout.isDefault ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingId === layout.id}
                        onClick={() => makeDefault(layout.id as string)}
                      >
                        Make default
                      </Button>
                    ) : null}
                    {layout.id ? (
                      <Link
                        href={`/settings/layouts/${encodeURIComponent(layout.id)}/edit`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Edit
                      </Link>
                    ) : null}
                    {layout.id ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingId === layout.id}
                        onClick={() => remove(layout.id as string)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
