'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import type { AdminFeature } from '@876/admin'
import { DataTable } from '@876/ui/data-table'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Switch } from '@876/ui/switch'
import { toast } from 'sonner'
import { Input } from '@876/ui/input'
import { SearchIcon } from '@876/ui/icons'

import { client } from '@/lib/client'
import { CursorPagination } from '@/components/patterns/cursor-pagination'
import { formatDate } from '@/lib/format'

type Props = {
  appSlug: string
  data: AdminFeature[]
  query: string
  moduleFeatureIds: string[]
  hasMore: boolean
  firstId: string | null
  lastId: string | null
  toolbarAction?: React.ReactNode
  emptyState?: React.ReactNode
}

function ToggleCell({ feature }: { feature: AdminFeature }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(feature.enabled)
  const [loading, setLoading] = useState(false)

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (loading) return
      const next = !enabled
      setEnabled(next)
      setLoading(true)
      const { error } = await client.features.update(feature.id, {
        enabled: next,
      })
      setLoading(false)
      if (error) {
        setEnabled(!next)
        toast.error(
          `Failed to ${next ? 'enable' : 'disable'} "${feature.name}": ${error}`
        )
      } else {
        toast.success(`"${feature.name}" ${next ? 'enabled' : 'disabled'}.`)
        router.refresh()
      }
    },
    [enabled, loading, feature.id, feature.name, router]
  )

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={enabled}
        onCheckedChange={() => {}}
        onClick={toggle}
        disabled={loading}
        aria-label={`Toggle ${feature.name}`}
      />
    </div>
  )
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

function buildColumns(
  appSlug: string,
  parentById: ReadonlyMap<string, AdminFeature>,
  moduleFeatureIds: ReadonlySet<string>
): ColumnDef<AdminFeature, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div
          className="flex items-center gap-3"
          style={{ paddingLeft: row.original.parent_feature_id ? 20 : 0 }}
        >
          <Link
            href={`/apps/${appSlug}/features/${row.original.id}`}
            className="hover:text-primary font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
          {row.original.parent_feature_id && (
            <span className="text-muted-foreground text-xs">
              under{' '}
              {parentById.get(row.original.parent_feature_id)?.name ??
                'parent flag'}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Slug" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.slug}
        </span>
      ),
    },
    {
      accessorKey: 'scope',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scope" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-[0.8125rem] capitalize">
          {row.original.scope}
        </span>
      ),
    },
    {
      id: 'controls',
      enableSorting: false,
      header: 'Controls',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.tags.includes('widget') && (
            <Badge variant="secondary">Widget</Badge>
          )}
          {moduleFeatureIds.has(row.original.id) && (
            <Badge variant="outline">Subscription-gated</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'enabled',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Enabled" />
      ),
      cell: ({ row }) => <ToggleCell feature={row.original} />,
    },
    {
      accessorKey: 'updated_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-[0.8125rem]">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
  ]
}

export function AppFeaturesTable({
  appSlug,
  data,
  query,
  moduleFeatureIds,
  hasMore,
  firstId,
  lastId,
  toolbarAction,
  emptyState,
}: Props) {
  const router = useRouter()
  const parentById = useMemo(
    () => new Map(data.map((feature) => [feature.id, feature])),
    [data]
  )
  const gatedIds = useMemo(() => {
    const moduleRoots = new Set(moduleFeatureIds)
    const result = new Set<string>()

    for (const feature of data) {
      let current: AdminFeature | undefined = feature
      const visited = new Set<string>()
      while (current && !visited.has(current.id)) {
        visited.add(current.id)
        if (moduleRoots.has(current.id)) {
          result.add(feature.id)
          break
        }
        current = current.parent_feature_id
          ? parentById.get(current.parent_feature_id)
          : undefined
      }
    }

    return result
  }, [data, moduleFeatureIds, parentById])
  const columns = buildColumns(appSlug, parentById, gatedIds)

  const ordered = useMemo(() => {
    const byParent = new Map<string | null, AdminFeature[]>()
    for (const feature of data) {
      const siblings = byParent.get(feature.parent_feature_id) ?? []
      siblings.push(feature)
      byParent.set(feature.parent_feature_id, siblings)
    }
    for (const siblings of byParent.values()) {
      siblings.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
    }

    const result: AdminFeature[] = []
    const visited = new Set<string>()
    function append(feature: AdminFeature) {
      if (visited.has(feature.id)) return
      visited.add(feature.id)
      result.push(feature)
      for (const child of byParent.get(feature.id) ?? []) append(child)
    }
    for (const root of byParent.get(null) ?? []) append(root)
    for (const feature of data) append(feature)
    return result
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full gap-2 sm:w-auto" method="get">
          <div className="relative w-full sm:w-80 lg:w-96">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search feature flags…"
              className="pl-9"
              aria-label="Search feature flags"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
        {toolbarAction}
      </div>

      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={ordered}
          emptyState={emptyState}
          onRowClick={(feature) =>
            router.push(`/apps/${appSlug}/features/${feature.id}`)
          }
        />
        {!query.trim() && (
          <CursorPagination
            firstId={firstId}
            lastId={lastId}
            hasMore={hasMore}
            count={data.length}
          />
        )}
      </div>
    </div>
  )
}
