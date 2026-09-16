'use client'

import type { Budget } from '@876/projects'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ReceiptPercentIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import Link from 'next/link'

import { MobileList, MobileListCell, MobileListEmpty } from '../mobile-list'
import { formatDay, formatMoneyOrUnpriced } from './format-money'

export type BudgetListProps = {
  budgets: readonly Budget[]
  currency: string
  newHref: string
  editBaseHref: string
  canEdit: boolean
}

export function budgetAmountLabel(budget: Budget, currency: string): string {
  if (budget.amountMinor !== null && budget.amountMinor !== undefined)
    return formatMoneyOrUnpriced(budget.amountMinor, currency)
  if (budget.hours !== null && budget.hours !== undefined)
    return `${budget.hours}h`
  return '—'
}

export function budgetScopeLabel(budget: Budget): string {
  if (budget.scope === 'milestone') return `Milestone ${budget.milestoneId ?? '—'}`
  if (budget.scope === 'user') return `Member ${budget.userId ?? '—'}`
  return 'Project'
}

function budgetPeriodLabel(budget: Budget): string {
  if (budget.periodStart === null && budget.periodEnd === null) return '—'
  const from = budget.periodStart === null ? '…' : formatDay(budget.periodStart)
  const to = budget.periodEnd === null ? '…' : formatDay(budget.periodEnd)
  return `${from} – ${to}`
}

export function BudgetList({
  budgets,
  currency,
  newHref,
  editBaseHref,
  canEdit,
}: BudgetListProps) {
  return (
    <>
      <MobileList>
        {budgets.length === 0 ? (
          <MobileListEmpty>No budgets yet</MobileListEmpty>
        ) : (
          budgets.map((budget) => (
            <MobileListCell
              key={budget.id}
              href={canEdit ? `${editBaseHref}/${encodeURIComponent(budget.id)}/edit` : undefined}
              avatar={budget.scope.slice(0, 1).toUpperCase()}
              title={budgetScopeLabel(budget)}
              subtitle={`${budgetAmountLabel(budget, currency)} · ${budget.thresholdPercent}% alert`}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Scope
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Budget
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Alert at
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Period
              </TableHead>
              {canEdit ? (
                <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ReceiptPercentIcon className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>No budgets yet</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((budget) => (
                <TableRow key={budget.id} className="transition-colors">
                  <TableCell className="px-5 py-4 font-medium">
                    {budgetScopeLabel(budget)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {budgetAmountLabel(budget, currency)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {budget.thresholdPercent}%
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {budgetPeriodLabel(budget)}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="px-5 py-4 text-right">
                      <Link
                        className="text-sm font-medium underline underline-offset-4"
                        href={`${editBaseHref}/${encodeURIComponent(budget.id)}/edit`}
                      >
                        Edit
                      </Link>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {canEdit ? (
        <div className="mt-3">
          <Link
            className="text-sm font-medium underline underline-offset-4"
            href={newHref}
          >
            Add budget
          </Link>
        </div>
      ) : null}
    </>
  )
}
