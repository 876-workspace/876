'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminFeature } from '@876/admin'
import { DataTable } from '@876/ui/data-table'
import { Switch } from '@876/ui/switch'
import { toast } from 'sonner'
import { Input } from '@876/ui/input'
import { SearchIcon } from '@876/ui/icons'

import { client } from '@/lib/client'
import { CursorPagination } from '@/components/cursor-pagination'
import { formatDate } from '@/lib/format'

type Props = {
  appSlug: string
  data: AdminFeature[]
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

function buildColumns(appSlug: string): ColumnDef<AdminFeature, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/apps/${appSlug}/features/${row.original.id}`}
            className="hover:text-primary font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.slug}
        </span>
      ),
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm capitalize">
          {row.original.scope}
        </span>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Enabled',
      cell: ({ row }) => <ToggleCell feature={row.original} />,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
  ]
}

export function AppFeaturesTable({
  appSlug,
  data,
  hasMore,
  firstId,
  lastId,
  toolbarAction,
  emptyState,
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const columns = buildColumns(appSlug)

  const filtered = data
    .filter((feature) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (
        feature.name.toLowerCase().includes(q) ||
        feature.slug.toLowerCase().includes(q)
      )
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search feature flags…"
            className="pl-9"
            aria-label="Search feature flags"
          />
        </div>
        {toolbarAction}
      </div>

      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          emptyState={emptyState}
          onRowClick={(feature) =>
            router.push(`/apps/${appSlug}/features/${feature.id}`)
          }
        />
        <CursorPagination
          firstId={firstId}
          lastId={lastId}
          hasMore={hasMore}
          count={data.length}
        />
      </div>
    </div>
  )
}
