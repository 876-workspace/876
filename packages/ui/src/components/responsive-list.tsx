import type { MouseEventHandler, ReactNode } from 'react'

import { ListRow, ListRowGroup } from './list-row'

export type ListRowMapping<T> = {
  key: (row: T) => string
  href?: (row: T) => string | undefined
  onClick?: (row: T) => MouseEventHandler<HTMLElement> | undefined
  leading?: (row: T) => ReactNode
  title: (row: T) => ReactNode
  subtitle?: (row: T) => ReactNode
  meta?: (row: T) => ReactNode
  trailing?: (row: T) => ReactNode
}

export function ResponsiveList<T>({
  rows,
  table,
  mapping,
  empty,
}: {
  rows: readonly T[]
  table: ReactNode
  mapping: ListRowMapping<T>
  empty?: ReactNode
}) {
  return (
    <>
      <div className="hidden sm:block">{table}</div>
      <ListRowGroup className="sm:hidden">
        {rows.length === 0
          ? empty
          : rows.map((row) => (
              <ListRow
                key={mapping.key(row)}
                href={mapping.href?.(row)}
                onClick={mapping.onClick?.(row)}
                leading={mapping.leading?.(row)}
                title={mapping.title(row)}
                subtitle={mapping.subtitle?.(row)}
                meta={mapping.meta?.(row)}
                trailing={mapping.trailing?.(row)}
              />
            ))}
      </ListRowGroup>
    </>
  )
}
