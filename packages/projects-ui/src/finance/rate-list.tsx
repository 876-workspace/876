'use client'

import type { Rate } from '@876/projects'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ClockIcon } from '@876/ui/icons'
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
import { formatDay, formatMoney } from './format-money'

export type RateListProps = {
  rates: readonly Rate[]
  newHref: string
  editBaseHref: string
  canEdit: boolean
}

export function rateScopeLabel(rate: Rate): string {
  if (rate.scope === 'project-user')
    return `Member ${rate.userId ?? '—'} on this project`
  if (rate.scope === 'user') return `Member ${rate.userId ?? '—'} (all projects)`
  return 'Project default'
}

export function rateAmountLabel(rate: Rate): string {
  const bill = formatMoney(rate.billRateMinor, rate.currency)
  const cost = formatMoney(rate.costRateMinor, rate.currency)
  return `${bill}/h bill · ${cost}/h cost`
}

function ratePeriodLabel(rate: Rate): string {
  if (rate.effectiveFrom === null && rate.effectiveTo === null) return '—'
  const from = rate.effectiveFrom === null ? '…' : formatDay(rate.effectiveFrom)
  const to = rate.effectiveTo === null ? '…' : formatDay(rate.effectiveTo)
  return `${from} – ${to}`
}

export function RateList({
  rates,
  newHref,
  editBaseHref,
  canEdit,
}: RateListProps) {
  return (
    <>
      <MobileList>
        {rates.length === 0 ? (
          <MobileListEmpty>No rates yet</MobileListEmpty>
        ) : (
          rates.map((rate) => (
            <MobileListCell
              key={rate.id}
              href={canEdit ? `${editBaseHref}/${encodeURIComponent(rate.id)}/edit` : undefined}
              avatar={rate.scope.slice(0, 1).toUpperCase()}
              title={rateScopeLabel(rate)}
              subtitle={rateAmountLabel(rate)}
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
                Bill rate
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Cost rate
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Effective
              </TableHead>
              {canEdit ? (
                <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ClockIcon className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>No rates yet</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              rates.map((rate) => (
                <TableRow key={rate.id} className="transition-colors">
                  <TableCell className="px-5 py-4 font-medium">
                    {rateScopeLabel(rate)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {formatMoney(rate.billRateMinor, rate.currency)}/h
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {formatMoney(rate.costRateMinor, rate.currency)}/h
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {ratePeriodLabel(rate)}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="px-5 py-4 text-right">
                      <Link
                        className="text-sm font-medium underline underline-offset-4"
                        href={`${editBaseHref}/${encodeURIComponent(rate.id)}/edit`}
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
            Add rate
          </Link>
        </div>
      ) : null}
    </>
  )
}
