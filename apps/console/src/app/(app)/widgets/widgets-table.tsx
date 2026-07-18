'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { WidgetVisual } from '@876/widgets'
import { DataTable } from '@876/ui/data-table'
import { ChevronRight } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'

import { CONSOLE_WIDGETS_FEATURE_SLUG } from '@/components/widgets/widget-catalog'
import { WidgetCatalogIcon } from '@/components/widgets/widget-catalog-icon'
import { WidgetFeatureToggle } from '@/components/widgets/widget-feature-toggle'

export interface WidgetTableRow {
  id: string
  name: string
  description: string
  detailHref: string
  visual: WidgetVisual
  apps: 'all' | string[]
  feature: { id: string; name: string; enabled: boolean } | null
  missingFeatureSlug: string | null
}

const APP_PILL_COLORS: Record<string, string> = {
  All: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-300',
  Console:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300',
  '876 Billing':
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300',
  '876 Enterprise':
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300',
  '876':
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300',
}

const columns: ColumnDef<WidgetTableRow, unknown>[] = [
  {
    id: 'icon',
    size: 64,
    enableSorting: false,
    header: () => <span className="sr-only">Widget icon</span>,
    cell: ({ row }) => <WidgetCatalogIcon visual={row.original.visual} />,
  },
  {
    accessorKey: 'name',
    size: 320,
    header: 'Widget',
    cell: ({ row }) => (
      <div className="max-w-80">
        <Link
          href={row.original.detailHref}
          className="hover:text-primary inline-block max-w-72 truncate font-medium"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name}
        </Link>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-5">
          {row.original.description}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'apps',
    header: 'Apps',
    cell: ({ row }) => {
      const apps = row.original.apps === 'all' ? ['All'] : row.original.apps
      return (
        <div className="flex flex-wrap gap-1.5">
          {apps.map((app) => (
            <span
              key={app}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium',
                APP_PILL_COLORS[app] ??
                  'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300'
              )}
            >
              {app}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    id: 'status',
    enableSorting: false,
    header: 'Status',
    cell: ({ row }) => (
      <div onClick={(event) => event.stopPropagation()}>
        {row.original.feature ? (
          <WidgetFeatureToggle feature={row.original.feature} />
        ) : (
          <span className="text-muted-foreground font-mono text-xs">
            Missing: {row.original.missingFeatureSlug}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'open',
    size: 44,
    enableSorting: false,
    header: () => <span className="sr-only">Open</span>,
    cell: () => <ChevronRight className="text-muted-foreground size-4" />,
  },
]

export function WidgetsTable({
  data,
  allWidgetsFeature,
}: {
  data: WidgetTableRow[]
  allWidgetsFeature: {
    id: string
    name: string
    enabled: boolean
  } | null
}) {
  const router = useRouter()

  return (
    <div className="876-card overflow-hidden">
      <div className="876-header-row border-876-surface-border flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div>
          <p className="text-sm font-medium">All</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Global switch for every widget in Console.
          </p>
        </div>
        {allWidgetsFeature ? (
          <WidgetFeatureToggle feature={allWidgetsFeature} />
        ) : (
          <span className="text-muted-foreground font-mono text-xs">
            Missing: {CONSOLE_WIDGETS_FEATURE_SLUG}
          </span>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(widget) => router.push(widget.detailHref)}
      />
    </div>
  )
}
