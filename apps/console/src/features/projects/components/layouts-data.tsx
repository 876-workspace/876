import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { LayoutGrid } from '@876/ui/icons'
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
} from '@876/projects-ui/mobile-list'

import { projects } from '@/lib/services/projects'

const LINK_CLASS =
  'text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300'

const EMPTY_TITLE = 'No layouts yet'

function layoutHref(hrefBase: string, layoutId: string): string {
  return `${hrefBase.replace(/\/$/, '')}/${encodeURIComponent(layoutId)}`
}

/**
 * The data half of the Layouts list, shared by every host. Rows render
 * through a Console-local read-only table; links resolve against the host's
 * Projects root. Built-in layouts carry no record id and render without a
 * link.
 */
export async function LayoutsData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  const result = await projects.layouts.list(organizationId)
  const layouts = result.data?.data ?? []
  const hrefBase = `${base}/layouts`

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Layout data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <MobileList>
        {layouts.length === 0 ? (
          <MobileListEmpty>{EMPTY_TITLE}</MobileListEmpty>
        ) : (
          layouts.map((layout) => (
            <MobileListCell
              key={
                layout.id ??
                `${layout.entity}:${layout.workItemTypeId ?? 'default'}:${layout.name}`
              }
              href={layout.id ? layoutHref(hrefBase, layout.id) : undefined}
              label={layout.id ? `View layout ${layout.name}` : undefined}
              avatar={layout.name.slice(0, 2).toUpperCase()}
              avatarClassName={avatarTone(layout.name)}
              title={layout.name}
              subtitle={`${layout.entity} · v${layout.version}${layout.isDefault ? ' · Default' : ''}`}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Layout
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Entity
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Type
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Default
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Version
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <LayoutGrid className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>{EMPTY_TITLE}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              layouts.map((layout) => (
                <TableRow
                  key={
                    layout.id ??
                    `${layout.entity}:${layout.workItemTypeId ?? 'default'}:${layout.name}`
                  }
                  className="transition-colors"
                >
                  <TableCell className="px-5 py-4">
                    {layout.id ? (
                      <Link
                        className={LINK_CLASS}
                        href={layoutHref(hrefBase, layout.id)}
                      >
                        {layout.name}
                      </Link>
                    ) : (
                      <span className="text-[0.8125rem] font-medium">
                        {layout.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs">
                    {layout.entity}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
                    {layout.workItemTypeId ?? '—'}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {layout.isDefault ? (
                      <Badge variant="info">Default</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums">
                    {`v${layout.version}`}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
