import Link from 'next/link'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import {
  avatarTone,
  MobileList,
  MobileListCell,
  MobileListEmpty,
} from '../mobile-list'
import { formatDay } from '../finance/format-money'
import { RecordStatusBadge } from './record-status-badge'
import type { CustomModuleRecord, CustomModuleStatus } from './types'

export type RecordListColumn = {
  fieldKey: string
  label: string
}

export type RecordListProps = {
  records: readonly CustomModuleRecord[]
  statuses?: readonly CustomModuleStatus[]
  columns?: readonly RecordListColumn[]
  hrefBase: string
}

const LINK_CLASS =
  'text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300'

const EMPTY_TITLE = 'No records yet'
const EMPTY_CELL = '—'

function recordHref(hrefBase: string, recordId: string): string {
  return `${hrefBase.replace(/\/$/, '')}/${encodeURIComponent(recordId)}`
}

export function formatRecordValue(
  value: string | string[] | number | boolean | null | undefined
): string {
  if (value === null || value === undefined) return EMPTY_CELL
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value.length === 0 ? EMPTY_CELL : value.join(', ')
  }
  return value === '' ? EMPTY_CELL : value
}

function statusLabel(
  statusKey: string,
  statuses: readonly CustomModuleStatus[] | undefined
): string {
  return statuses?.find((status) => status.key === statusKey)?.label ?? statusKey
}

export function RecordList({
  records,
  statuses,
  columns = [],
  hrefBase,
}: RecordListProps) {
  const visibleColumns = columns.slice(0, 4)

  return (
    <>
      <MobileList>
        {records.length === 0 ? (
          <MobileListEmpty>{EMPTY_TITLE}</MobileListEmpty>
        ) : (
          records.map((record) => (
            <MobileListCell
              key={record.id}
              href={recordHref(hrefBase, record.id)}
              label={`View record ${record.title}`}
              avatar={record.title.slice(0, 2).toUpperCase()}
              avatarClassName={avatarTone(record.id)}
              title={record.title}
              subtitle={statusLabel(record.statusKey, statuses)}
              meta={formatDay(record.updatedAt)}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Title
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Status
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.fieldKey}
                  className="px-5 py-3.5 text-[0.8125rem] font-semibold"
                >
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3 + visibleColumns.length} className="p-0">
                  <p className="text-muted-foreground px-5 py-14 text-center text-sm">
                    {EMPTY_TITLE}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="transition-colors">
                  <TableCell className="px-5 py-4">
                    <Link
                      className={LINK_CLASS}
                      href={recordHref(hrefBase, record.id)}
                    >
                      {record.title}
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <RecordStatusBadge
                      statusKey={record.statusKey}
                      statuses={statuses}
                    />
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.fieldKey}
                      className="px-5 py-4 text-sm"
                    >
                      {formatRecordValue(record.values[column.fieldKey])}
                    </TableCell>
                  ))}
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                    {formatDay(record.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
