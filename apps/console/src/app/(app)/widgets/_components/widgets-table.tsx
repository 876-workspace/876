'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { WidgetVisual } from '@876/widgets'
import { DataTable } from '@876/ui/data-table'
import { ChevronRight, LayoutGrid } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'

import { WidgetCatalogIcon } from '@/features/widgets/components/widget-catalog-icon'
import { FeatureToggle } from '@/components/patterns/feature-toggle'

export interface WidgetFeatureSummary {
  id: string
  name: string
  enabled: boolean
}

/**
 * The global switch shares the table with the widgets it governs instead of
 * sitting in a card header above it, so it reads as part of the same list and
 * its toggle lines up under the same Status column as every widget's.
 */
export type WidgetTableRow =
  | {
      kind: 'master'
      id: string
      name: string
      description: string
      apps: string[]
      feature: WidgetFeatureSummary | null
      missingFeatureSlug: string | null
    }
  | {
      kind: 'widget'
      id: string
      name: string
      description: string
      detailHref: string
      visual: WidgetVisual
      apps: 'all' | string[]
      feature: WidgetFeatureSummary | null
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
    cell: ({ row }) =>
      row.original.kind === 'master' ? (
        <span className="border-876-surface-border bg-876-surface text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-lg border shadow-xs">
          <LayoutGrid className="size-5" />
        </span>
      ) : (
        <WidgetCatalogIcon visual={row.original.visual} />
      ),
  },
  {
    accessorKey: 'name',
    size: 320,
    header: 'Widget',
    cell: ({ row }) => (
      <div className="max-w-80">
        {row.original.kind === 'master' ? (
          <span className="inline-block max-w-72 truncate font-medium text-sky-600 dark:text-sky-400">
            {row.original.name}
          </span>
        ) : (
          <Link
            href={row.original.detailHref}
            className="inline-block max-w-72 truncate font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        )}
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
          <FeatureToggle feature={row.original.feature} />
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
    cell: ({ row }) =>
      row.original.kind === 'widget' ? (
        <ChevronRight className="text-muted-foreground size-4" />
      ) : null,
  },
]

export function WidgetsTable({ data }: { data: WidgetTableRow[] }) {
  const router = useRouter()

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        rowClassName={(row) =>
          row.kind === 'master' ? 'bg-muted/30 hover:bg-muted/40' : ''
        }
        onRowClick={(row) => {
          if (row.kind === 'widget') router.push(row.detailHref)
        }}
      />
    </div>
  )
}
