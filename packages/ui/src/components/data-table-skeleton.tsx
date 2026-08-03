import { cn } from '../lib/utils'
import { Skeleton } from './skeleton'

/**
 * One column of a {@link DataTableSkeleton}. `label` is the real header text so
 * the skeleton shows the same columns the loaded table will — the header row is
 * never a placeholder.
 */
type DataTableSkeletonColumn = {
  /** Header text. Rendered verbatim, matching the loaded table's header. */
  label: string
  /** Fixed column width, e.g. `'36px'`. Omit to let the column flex. */
  width?: string
  /** Renders the header text for screen readers only (avatar/action columns). */
  srOnly?: boolean
  /**
   * Shape of the placeholder in each body cell. `text` is a plain bar,
   * `avatar` pairs a rounded swatch with a bar, `badge` is a short pill.
   */
  cell?: 'text' | 'avatar' | 'badge'
  /** Width of the placeholder bar. Defaults to a per-`cell` sensible value. */
  cellWidth?: string
}

const CELL_DEFAULT_WIDTH: Record<
  NonNullable<DataTableSkeletonColumn['cell']>,
  string
> = {
  text: '70%',
  avatar: '60%',
  badge: '4.5rem',
}

function SkeletonCell({ column }: { column: DataTableSkeletonColumn }) {
  const kind = column.cell ?? 'text'
  const width = column.cellWidth ?? CELL_DEFAULT_WIDTH[kind]

  if (kind === 'avatar') {
    return (
      <span className="flex items-center gap-3">
        <Skeleton className="size-6 shrink-0 rounded-md" />
        <Skeleton className="h-4" style={{ width }} />
      </span>
    )
  }

  if (kind === 'badge') {
    return <Skeleton className="h-5 rounded-md" style={{ width }} />
  }

  return <Skeleton className="h-4" style={{ width }} />
}

/**
 * Placeholder for a {@link DataTable} that has not loaded yet.
 *
 * Renders the real header row — same markup, same column labels — with
 * shimmering body cells, so a list page can paint its toolbar and table chrome
 * immediately while the rows stream in behind a `<Suspense>` boundary. Use the
 * identical column set in the route's `loading.tsx` and in the page's Suspense
 * fallback so a hard load and a client navigation show the same shell.
 *
 * This is a Server Component and ships **no** JavaScript, which is why it
 * inlines the plain `table` elements and their classes rather than importing
 * the `Table` primitives from `./table`. Those are marked `'use client'`, so
 * importing them here would open a Client Component boundary inside every
 * `loading.tsx` — forcing Next.js to send and hydrate the table module and
 * serialize each generated row, on exactly the navigations this exists to make
 * cheap. Keep the markup below in sync with `./table` by hand.
 *
 * @example
 * const COLUMNS: DataTableSkeletonColumn[] = [
 *   { label: 'Name', cell: 'avatar' },
 *   { label: 'Email' },
 *   { label: 'Status', cell: 'badge' },
 * ]
 *
 * <Suspense fallback={<DataTableSkeleton columns={COLUMNS} />}>
 *   <UsersTableData />
 * </Suspense>
 */
function DataTableSkeleton({
  columns,
  rows = 8,
  card = true,
  className,
}: {
  columns: DataTableSkeletonColumn[]
  /** Number of placeholder rows. Defaults to 8. */
  rows?: number
  /** Wrap in the standard `876-card` surface, as loaded tables are. */
  card?: boolean
  className?: string
}) {
  const table = (
    <div
      data-slot="table-container"
      aria-hidden="true"
      className="relative w-full overflow-x-auto"
    >
      <table data-slot="table" className="w-full caption-bottom text-sm">
        <thead
          data-slot="table-header"
          className="876-header-row [&_tr]:border-b"
        >
          <tr data-slot="table-row" className="border-b transition-colors">
            {columns.map((column) => (
              <th
                key={column.label}
                data-slot="table-head"
                className="text-foreground h-10 px-5 py-3.5 text-left align-middle font-medium whitespace-nowrap"
                style={column.width ? { width: column.width } : undefined}
              >
                {column.srOnly ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr
              key={rowIndex}
              data-slot="table-row"
              className="border-b transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.label}
                  data-slot="table-cell"
                  className="px-5 py-4 align-middle whitespace-nowrap"
                  style={column.width ? { width: column.width } : undefined}
                >
                  <SkeletonCell column={column} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (!card) return <div className={className}>{table}</div>

  return <div className={cn('876-card', className)}>{table}</div>
}

export { DataTableSkeleton, type DataTableSkeletonColumn }
