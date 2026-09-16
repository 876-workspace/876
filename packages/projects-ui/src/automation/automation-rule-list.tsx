import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { SparklesIcon } from '@876/ui/icons'
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
import { TRIGGER_LABELS } from './labels'
import type { AutomationRule } from './types'

export type AutomationRuleListProps = {
  rules: readonly AutomationRule[]
  hrefBase: string
}

const LINK_CLASS =
  'text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300'

const EMPTY_TITLE = 'No automation rules yet'

function ruleHref(hrefBase: string, ruleId: string): string {
  return `${hrefBase.replace(/\/$/, '')}/${encodeURIComponent(ruleId)}`
}

export function AutomationRuleList({ rules, hrefBase }: AutomationRuleListProps) {
  return (
    <>
      <MobileList>
        {rules.length === 0 ? (
          <MobileListEmpty>{EMPTY_TITLE}</MobileListEmpty>
        ) : (
          rules.map((rule) => (
            <MobileListCell
              key={rule.id}
              href={ruleHref(hrefBase, rule.id)}
              label={`View rule ${rule.name}`}
              avatar={rule.name.slice(0, 2).toUpperCase()}
              avatarClassName={avatarTone(rule.id)}
              title={rule.name}
              subtitle={`${TRIGGER_LABELS[rule.trigger]} · ${rule.actions.length} ${rule.actions.length === 1 ? 'action' : 'actions'}`}
              meta={rule.enabled ? 'Enabled' : 'Disabled'}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Rule
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Trigger
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Status
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Actions
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SparklesIcon className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>{EMPTY_TITLE}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id} className="transition-colors">
                  <TableCell className="px-5 py-4">
                    <Link
                      className={LINK_CLASS}
                      href={ruleHref(hrefBase, rule.id)}
                    >
                      {rule.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    {TRIGGER_LABELS[rule.trigger]}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge variant={rule.enabled ? 'success' : 'secondary'}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums">
                    {rule.actions.length}{' '}
                    {rule.actions.length === 1 ? 'action' : 'actions'}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                    {formatDay(rule.updatedAt)}
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
