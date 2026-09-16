import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { DocumentDuplicateIcon } from '@876/ui/icons'
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
import type { ProjectTemplate } from './types'

export type TemplateListProps = {
  templates: readonly ProjectTemplate[]
  hrefBase: string
}

const LINK_CLASS =
  'text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300'

const EMPTY_TITLE = 'No templates yet'

function templateHref(hrefBase: string, templateId: string): string {
  return `${hrefBase.replace(/\/$/, '')}/${encodeURIComponent(templateId)}`
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** The four definition counts as one comparable line, e.g. "4 phases · 2 task lists". */
export function formatTemplateCounts(
  counts: ProjectTemplate['counts']
): string {
  return [
    countLabel(counts.phases, 'phase', 'phases'),
    countLabel(counts.taskLists, 'task list', 'task lists'),
    countLabel(counts.workItems, 'work item', 'work items'),
    countLabel(counts.dependencies, 'dependency', 'dependencies'),
  ].join(' · ')
}

export function TemplateList({ templates, hrefBase }: TemplateListProps) {
  return (
    <>
      <MobileList>
        {templates.length === 0 ? (
          <MobileListEmpty>{EMPTY_TITLE}</MobileListEmpty>
        ) : (
          templates.map((template) => (
            <MobileListCell
              key={template.id}
              href={templateHref(hrefBase, template.id)}
              label={`View template ${template.name}`}
              avatar={template.key.slice(0, 2).toUpperCase()}
              avatarClassName={avatarTone(template.key)}
              title={template.name}
              subtitle={`${template.key} · v${template.currentVersion}`}
              meta={formatDay(template.updatedAt)}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Template
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Key
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Version
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Counts
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <DocumentDuplicateIcon className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>{EMPTY_TITLE}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id} className="transition-colors">
                  <TableCell className="px-5 py-4">
                    <div className="min-w-0">
                      <Link
                        className={LINK_CLASS}
                        href={templateHref(hrefBase, template.id)}
                      >
                        {template.name}
                      </Link>
                      {template.description ? (
                        <p className="text-muted-foreground max-w-md truncate text-xs">
                          {template.description}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
                    {template.key}
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums">
                    {`v${template.currentVersion}`}
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums">
                    {formatTemplateCounts(template.counts)}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                    {formatDay(template.updatedAt)}
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
