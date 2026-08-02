import { cn } from '../lib/utils'
import { Skeleton } from './skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

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
 * This is a Server Component: it ships no JavaScript and is safe inside
 * `loading.tsx`.
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
    <Table>
      <TableHeader className="876-header-row">
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.label}
              className="px-5 py-3.5"
              style={column.width ? { width: column.width } : undefined}
            >
              {column.srOnly ? (
                <span className="sr-only">{column.label}</span>
              ) : (
                column.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((column) => (
              <TableCell
                key={column.label}
                className="px-5 py-4"
                style={column.width ? { width: column.width } : undefined}
              >
                <SkeletonCell column={column} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  if (!card) return <div className={className}>{table}</div>

  return <div className={cn('876-card', className)}>{table}</div>
}

export { DataTableSkeleton, type DataTableSkeletonColumn }
