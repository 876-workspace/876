import { Badge } from '@876/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import Link from 'next/link'

import { formatDay } from '../finance/format-money'
import {
  avatarTone,
  MobileList,
  MobileListCell,
  MobileListEmpty,
} from '../mobile-list'
import type { CustomModule } from './types'

export type CustomModuleListProps = {
  modules: readonly CustomModule[]
  hrefBase: string
}

const LINK_CLASS =
  'text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300'

const EMPTY_TITLE = 'No custom modules yet'

function moduleHref(hrefBase: string, moduleId: string): string {
  return `${hrefBase.replace(/\/$/, '')}/${encodeURIComponent(moduleId)}`
}

function formatScope(scope: CustomModule['scope']): string {
  return scope === 'org' ? 'Organization' : 'Project'
}

export function CustomModuleList({ modules, hrefBase }: CustomModuleListProps) {
  return (
    <>
      <MobileList>
        {modules.length === 0 ? (
          <MobileListEmpty>{EMPTY_TITLE}</MobileListEmpty>
        ) : (
          modules.map((module) => (
            <MobileListCell
              key={module.id}
              href={moduleHref(hrefBase, module.id)}
              label={`View module ${module.pluralName}`}
              avatar={module.pluralName.slice(0, 2).toUpperCase()}
              avatarClassName={avatarTone(module.id)}
              title={module.pluralName}
              subtitle={`${formatScope(module.scope)} · ${module.fieldCount} ${module.fieldCount === 1 ? 'field' : 'fields'}`}
              meta={`${module.recordCount} ${module.recordCount === 1 ? 'record' : 'records'}`}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Name
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Scope
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Fields
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Records
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <p className="text-muted-foreground px-5 py-14 text-center text-sm">
                    {EMPTY_TITLE}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              modules.map((module) => (
                <TableRow key={module.id} className="transition-colors">
                  <TableCell className="px-5 py-4">
                    <Link
                      className={LINK_CLASS}
                      href={moduleHref(hrefBase, module.id)}
                    >
                      {module.pluralName}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {module.key}
                    </p>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge variant="secondary">
                      {formatScope(module.scope)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums">
                    {module.fieldCount}{' '}
                    {module.fieldCount === 1 ? 'field' : 'fields'}
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums">
                    {module.recordCount}{' '}
                    {module.recordCount === 1 ? 'record' : 'records'}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                    {formatDay(module.updatedAt)}
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
